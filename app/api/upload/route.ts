import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { parseDocument } from '@/lib/parse';
import type { DocumentAnalysis } from '@/lib/document-analysis';
import { requireAuth } from '@/lib/auth-utils';
import { ingestDocument } from '@/lib/rag/ingest';
import { checkDocumentUploadAccess } from '@/lib/access-control';

const isDev = process.env.NODE_ENV !== 'production';

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 API Route:', request.url);
    console.log('🔑 Using:', {
      supabase: !!supabaseAdmin,
      gemini: false,
    });

    // Get authenticated user
    const userId = await requireAuth();

    // 🔒 Check document upload limit (30 documents max)
    const uploadAccess = await checkDocumentUploadAccess(userId);
    if (!uploadAccess.allowed) {
      return NextResponse.json(
        { error: uploadAccess.reason, current: uploadAccess.current, limit: uploadAccess.limit },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }


    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const fileName = `${userId}/${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from('resumes')
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Create document record
    const { data: document, error: dbError } = await supabaseAdmin
      .from('documents')
      .insert({
        user_id: userId,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: fileName,
        parse_status: 'processing',
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error creating document:', dbError.message);
      return NextResponse.json(
        {
          error: 'Failed to create document record',
          details: dbError.message,
          code: dbError.code,
        },
        { status: 500 }
      );
    }

    // Parse document (includes automatic OCR fallback for scanned PDFs)
    let lastAnalysis: DocumentAnalysis | undefined = undefined;

    try {
      const parsed = await parseDocument(buffer, file.type, file.name);
      lastAnalysis = parsed.analysis;

      // Log OCR usage
      if (parsed.metadata.wasOcr) {
        console.log(`📸 [Upload] OCR was used for ${file.name}:`, {
          confidence: parsed.metadata.ocrConfidence,
          extractedWords: parsed.metadata.rawWordCount,
        });
      }

      if (!parsed.text.trim()) {
        const isPlaceholderTemplate =
          parsed.analysis.type === 'template' || parsed.analysis.placeholder.flagged;

        const errorCode = isPlaceholderTemplate ? 'PLACEHOLDER_ONLY' : 'NO_EXTRACTABLE_TEXT';
        const errorMessage = isPlaceholderTemplate
          ? 'Document appears to be a placeholder template. Please upload a completed resume.'
          : 'We could not extract any text from this file, even after attempting OCR. The document may be corrupted, have very low image quality, or be in an unsupported format.';

        await supabaseAdmin
          .from('documents')
          .update({
            parse_status: 'failed',
            document_type: isPlaceholderTemplate ? 'template' : parsed.analysis.type,
            has_placeholder_content: parsed.analysis.placeholder.flagged,
            placeholder_summary: parsed.analysis.placeholder,
            parse_error: {
              code: errorCode,
              message: errorMessage,
            },
            parsed_content: {
              sanitizedText: '',
              metadata: parsed.metadata,
              analysis: parsed.analysis,
            },
          })
          .eq('id', document.id);

        return NextResponse.json(
          {
            error: errorMessage,
            code: errorCode,
          },
          { status: 422 }
        );
      }

      const geminiFileUri = null;

      // Update document with parsed content + chunk metadata
      await supabaseAdmin
        .from('documents')
        .update({
          parsed_content: {
            sanitizedText: parsed.text,
            metadata: parsed.metadata,
            analysis: parsed.analysis,
          },
          parse_status: 'completed',
          gemini_file_uri: geminiFileUri,
          document_type: parsed.analysis.type,
          has_placeholder_content: parsed.analysis.placeholder.flagged,
          placeholder_summary: parsed.analysis.placeholder,
          parse_error: null,
        })
        .eq('id', document.id);

      // Trigger Atomic RAG ingestion (separate try-catch to not revert parse_status)
      try {
        await ingestDocument(document.id, parsed.text, userId, {
          metadata: parsed.metadata,
          analysis: parsed.analysis,
          chunkCount: 0,
          structuredData: parsed.analysis?.structured || null,
        });
      } catch (ingestError) {
        // Don't revert parse_status - document was parsed successfully
        if (isDev) console.error('❌ Ingestion error (document still marked completed):', ingestError);
      }
    } catch (parseError) {
      if (isDev) console.error('❌ Parse error:', parseError);

      const parseErrorMessage =
        parseError instanceof Error ? parseError.message : String(parseError);

      await supabaseAdmin
        .from('documents')
        .update({
          parse_status: 'failed',
          parse_error: {
            code: 'PARSE_FAILED',
            message: parseErrorMessage,
          },
        })
        .eq('id', document.id);

      return NextResponse.json(
        { error: 'Failed to process document', code: 'PARSE_FAILED' },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      document,
      analysis: lastAnalysis,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const userId = await requireAuth();

    // Only select columns needed by the documents list UI
    const { data: documents, error } = await supabaseAdmin
      .from('documents')
      .select('id, file_name, file_type, file_size, parse_status, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    return NextResponse.json({ documents });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Remove all data parsed from a specific document
 * This is called when a document is deleted to remove all related parsed data.
 * 
 * What gets removed:
 * - Experiences that ONLY had this document as a source
 * - Bullets that ONLY had this document as a source
 * - Skills linked to deleted experiences (via cascade)
 * 
 * Note: Skills, education, and certifications are not directly linked to documents,
 * so we can't track which came from which document. However, skills linked to
 * deleted experiences will be cleaned up via cascade, and the canonical profile
 * will be rebuilt to reflect remaining data.
 */
async function removeDocumentParsedData(documentId: string, userId: string) {
  let deletedExperiences = 0;
  let deletedBullets = 0;

  // Find all experiences that ONLY have this document as a source
  const { data: experienceSources } = await supabaseAdmin
    .from('experience_sources')
    .select('experience_id')
    .eq('document_id', documentId);

  if (experienceSources && experienceSources.length > 0) {
    const experienceIds = experienceSources.map((s: any) => s.experience_id);

    // For each experience, check if it has other sources
    for (const expId of experienceIds) {
      const { data: otherSources } = await supabaseAdmin
        .from('experience_sources')
        .select('document_id')
        .eq('experience_id', expId)
        .neq('document_id', documentId);

      // If this is the only source, delete the experience (bullets will cascade)
      if (!otherSources || otherSources.length === 0) {
        const { error } = await supabaseAdmin
          .from('experiences')
          .delete()
          .eq('id', expId);

        if (!error) {
          deletedExperiences++;
        }
      }
    }
  }

  // Find all bullets that ONLY have this document as a source
  // (Note: Some bullets may have already been deleted via experience cascade)
  const { data: bulletSources } = await supabaseAdmin
    .from('experience_bullet_sources')
    .select('bullet_id')
    .eq('document_id', documentId);

  if (bulletSources && bulletSources.length > 0) {
    const bulletIds = bulletSources.map((s: any) => s.bullet_id);

    // For each bullet, check if it has other sources
    for (const bulletId of bulletIds) {
      const { data: otherBulletSources } = await supabaseAdmin
        .from('experience_bullet_sources')
        .select('document_id')
        .eq('bullet_id', bulletId)
        .neq('document_id', documentId);

      // If this is the only source, delete the bullet
      if (!otherBulletSources || otherBulletSources.length === 0) {
        const { error } = await supabaseAdmin
          .from('experience_bullets')
          .delete()
          .eq('id', bulletId);

        if (!error) {
          deletedBullets++;
        }
      }
    }
  }

}

/**
 * Clean up orphaned experiences and bullets that have no remaining source documents
 * This happens when all source documents for an experience/bullet are deleted
 */
async function cleanupOrphanedExperiences(userId: string) {
  // Get all experiences for this user
  const { data: allExperiences, error: expError } = await supabaseAdmin
    .from('experiences')
    .select('id')
    .eq('user_id', userId);

  if (expError || !allExperiences || allExperiences.length === 0) {
    return;
  }

  // Get all experience sources
  const { data: allSources } = await supabaseAdmin
    .from('experience_sources')
    .select('experience_id');

  const sourceExperienceIds = new Set(
    (allSources || []).map((s: any) => s.experience_id)
  );

  // Find experiences with no sources
  const orphanedExperienceIds = allExperiences
    .filter((exp: any) => !sourceExperienceIds.has(exp.id))
    .map((exp: any) => exp.id);

  if (orphanedExperienceIds.length > 0) {
    // Delete orphaned experiences (bullets will cascade delete)
    await supabaseAdmin
      .from('experiences')
      .delete()
      .in('id', orphanedExperienceIds);
  }

  // Also check for orphaned bullets (bullets that lost all sources but experience still exists)
  // Get all bullets for user's remaining experiences
  const { data: remainingExperiences } = await supabaseAdmin
    .from('experiences')
    .select('id')
    .eq('user_id', userId);

  if (!remainingExperiences || remainingExperiences.length === 0) {
    return;
  }

  const remainingExpIds = remainingExperiences.map((e: any) => e.id);

  const { data: allBullets } = await supabaseAdmin
    .from('experience_bullets')
    .select('id')
    .in('experience_id', remainingExpIds);

  if (!allBullets || allBullets.length === 0) {
    return;
  }

  // Get all bullet sources
  const { data: allBulletSources } = await supabaseAdmin
    .from('experience_bullet_sources')
    .select('bullet_id');

  const sourceBulletIds = new Set(
    (allBulletSources || []).map((s: any) => s.bullet_id)
  );

  // Find bullets with no sources
  const orphanedBulletIds = allBullets
    .filter((bullet: any) => !sourceBulletIds.has(bullet.id))
    .map((bullet: any) => bullet.id);

  if (orphanedBulletIds.length > 0) {
    await supabaseAdmin
      .from('experience_bullets')
      .delete()
      .in('id', orphanedBulletIds);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get authenticated user
    const userId = await requireAuth();

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Verify document exists and belongs to user
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('id, user_id, storage_path')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !document) {
      console.error('Document not found or unauthorized:', fetchError);
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Delete from storage if storage_path exists
    if (document.storage_path) {
      try {
        await supabaseAdmin.storage
          .from('resumes')
          .remove([document.storage_path]);
      } catch (storageError) {
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Remove all parsed data from this document BEFORE deleting the document
    // This ensures we clean up experiences/bullets that only had this document as a source
    try {
      await removeDocumentParsedData(documentId, userId);
    } catch {
      // Continue with deletion - we'll do orphaned cleanup after
    }

    // Delete document (cascades to chunks and source links via ON DELETE CASCADE)
    const { error: deleteError } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', documentId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error('Error deleting document:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete document' },
        { status: 500 }
      );
    }

    // Clean up any remaining orphaned experiences and bullets
    try {
      await cleanupOrphanedExperiences(userId);
    } catch {
      // Don't fail the deletion if cleanup fails
    }

    // Rebuild canonical profile to reflect the deletions
    try {
      const { canonicalizeProfile } = await import('@/lib/profile-canonicalizer');
      await canonicalizeProfile(userId);
    } catch {
      // Canonicalization can happen later
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
