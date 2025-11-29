import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { parseDocument, chunkText } from '@/lib/parse';
import type { DocumentAnalysis } from '@/lib/document-analysis';
import { uploadFileToGemini, uploadTextChunkToGemini, embedText } from '@/lib/gemini';
import { requireAuth } from '@/lib/auth-utils';
import { MAX_CHUNK_SIZE, MAX_CHUNKS_PER_DOCUMENT, MIN_CHUNK_LENGTH } from '@/lib/chunking';
import { ingestDocument } from '@/lib/rag/ingest';

// 🔑 Environment variable logging (REMOVE IN PRODUCTION)
console.log('📤 Upload API - Environment check:', {
  supabase: !!supabaseAdmin ? '✅' : '❌',
});

export async function POST(request: NextRequest) {
  console.log('📤 Upload API - POST request received');

  try {
    // Get authenticated user
    const userId = await requireAuth();
    console.log('🔐 Upload API - User authenticated:', userId ? '✅' : '❌');

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
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
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
    console.log('📝 Creating document record:', {
      userId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      storagePath: fileName,
    });

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
      console.error('❌ Database error creating document:', {
        error: dbError,
        code: dbError.code,
        message: dbError.message,
        details: dbError.details,
        hint: dbError.hint,
        userId,
        fileName: file.name,
      });
      return NextResponse.json(
        {
          error: 'Failed to create document record',
          details: dbError.message,
          code: dbError.code,
        },
        { status: 500 }
      );
    }

    console.log('✅ Document record created:', document.id);

    // Parse document in background
    let lastAnalysis: DocumentAnalysis | undefined = undefined;

    try {
      console.log('📄 Parsing document...');
      const parsed = await parseDocument(buffer, file.type);
      lastAnalysis = parsed.analysis;
      console.log('✅ Document parsed, sanitized text length:', parsed.text.length);
      // REMOVE IN PRODUCTION
      console.log('🔍 Document analysis:', {
        documentId: document.id,
        type: parsed.analysis.type,
        placeholderMatches: parsed.analysis.placeholder.totalMatches,
        placeholderDensity: parsed.analysis.placeholder.density,
        placeholderFlagged: parsed.analysis.placeholder.flagged,
        examples: parsed.analysis.placeholder.examples,
      });

      if (!parsed.text.trim()) {
        await supabaseAdmin
          .from('documents')
          .update({
            parse_status: 'failed',
            document_type: 'template',
            has_placeholder_content: true,
            placeholder_summary: parsed.analysis.placeholder,
            parsed_content: {
              sanitizedText: '',
              metadata: parsed.metadata,
              analysis: parsed.analysis,
            },
          })
          .eq('id', document.id);

        return NextResponse.json(
          {
            error: 'Document appears to be a placeholder template. Please upload a completed resume.',
            code: 'PLACEHOLDER_ONLY',
          },
          { status: 422 }
        );
      }

      /* 
      // Skip chunk processing for now to prevent timeouts on legacy schema
      const chunks = chunkText(parsed.text, MAX_CHUNK_SIZE)
        .filter(chunk => chunk.trim().length >= MIN_CHUNK_LENGTH)
        .slice(0, MAX_CHUNKS_PER_DOCUMENT);
      
      // ... removed heavy Gemini loop ...
      */
      const chunkRecords: any[] = [];
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
        })
        .eq('id', document.id);

      console.log('✅ Document updated in database (chunks skipped)');

      // Trigger Atomic RAG ingestion (separate try-catch to not revert parse_status)
      console.log('🚀 Triggering Atomic RAG ingestion...');
      try {
        await ingestDocument(document.id, parsed.text, userId, {
          metadata: parsed.metadata,
          analysis: parsed.analysis,
          chunkCount: 0,
          structuredData: parsed.analysis?.structured || null,
        });
        console.log('✅ Atomic RAG ingestion completed');
      } catch (ingestError) {
        // Don't revert parse_status - document was parsed successfully
        console.error('❌ Ingestion error (document still marked completed):', ingestError);
      }
    } catch (parseError) {
      console.error('❌ Parse error:', parseError);
      await supabaseAdmin
        .from('documents')
        .update({ parse_status: 'failed' })
        .eq('id', document.id);
    }

    return NextResponse.json({
      success: true,
      document,
      analysis: lastAnalysis,
    });
  } catch (error: any) {
    console.error('❌ Upload error:', error);

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
  console.log('📤 Upload API - GET request received');

  try {
    // Get authenticated user
    const userId = await requireAuth();
    console.log('🔐 Upload API - User authenticated:', userId ? '✅' : '❌');

    const { data: documents, error } = await supabaseAdmin
      .from('documents')
      .select('*')
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
    console.error('❌ Fetch error:', error);

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
  console.log(`🧹 Removing all parsed data for document: ${documentId}`);

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
        console.log(`   🗑️  Deleting experience ${expId} (only source was this document)`);
        const { error } = await supabaseAdmin
          .from('experiences')
          .delete()
          .eq('id', expId);
        
        if (!error) {
          deletedExperiences++;
        } else {
          console.error(`   ❌ Error deleting experience ${expId}:`, error.message);
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
        console.log(`   🗑️  Deleting bullet ${bulletId} (only source was this document)`);
        const { error } = await supabaseAdmin
          .from('experience_bullets')
          .delete()
          .eq('id', bulletId);
        
        if (!error) {
          deletedBullets++;
        } else {
          console.error(`   ❌ Error deleting bullet ${bulletId}:`, error.message);
        }
      }
    }
  }

  console.log(`✅ Removed parsed data: ${deletedExperiences} experiences, ${deletedBullets} bullets`);
  console.log(`   Note: Skills linked to deleted experiences were also removed via cascade`);
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
    console.log(`🧹 Found ${orphanedExperienceIds.length} orphaned experience(s) to clean up`);
    
    // Delete orphaned experiences (bullets will cascade delete)
    const { error: deleteError } = await supabaseAdmin
      .from('experiences')
      .delete()
      .in('id', orphanedExperienceIds);

    if (deleteError) {
      console.error('Error deleting orphaned experiences:', deleteError);
    } else {
      console.log(`✅ Deleted ${orphanedExperienceIds.length} orphaned experience(s)`);
    }
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
    console.log(`🧹 Found ${orphanedBulletIds.length} orphaned bullet(s) to clean up`);
    
    const { error: deleteBulletError } = await supabaseAdmin
      .from('experience_bullets')
      .delete()
      .in('id', orphanedBulletIds);

    if (deleteBulletError) {
      console.error('Error deleting orphaned bullets:', deleteBulletError);
    } else {
      console.log(`✅ Deleted ${orphanedBulletIds.length} orphaned bullet(s)`);
    }
  }
}

export async function DELETE(request: NextRequest) {
  console.log('🗑️ Upload API - DELETE request received');

  try {
    // Get authenticated user
    const userId = await requireAuth();
    console.log('🔐 Upload API - User authenticated:', userId ? '✅' : '❌');

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
        const { error: storageError } = await supabaseAdmin.storage
          .from('resumes')
          .remove([document.storage_path]);

        if (storageError) {
          console.error('Storage deletion error:', storageError);
          // Continue with database deletion even if storage deletion fails
        } else {
          console.log('✅ File deleted from storage:', document.storage_path);
        }
      } catch (storageError) {
        console.error('Storage deletion error:', storageError);
      }
    }

    // Remove all parsed data from this document BEFORE deleting the document
    // This ensures we clean up experiences/bullets that only had this document as a source
    try {
      await removeDocumentParsedData(documentId, userId);
    } catch (removeError: any) {
      // Log but continue with deletion - we'll do orphaned cleanup after
      console.error('⚠️ Error removing document parsed data:', removeError.message);
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
    // This catches any edge cases where data might still be orphaned
    try {
      await cleanupOrphanedExperiences(userId);
      console.log('✅ Cleaned up any remaining orphaned experiences and bullets');
    } catch (cleanupError: any) {
      // Log but don't fail the deletion if cleanup fails
      console.error('⚠️ Error cleaning up orphaned data:', cleanupError.message);
    }

    // Rebuild canonical profile to reflect the deletions
    try {
      const { canonicalizeProfile } = await import('@/lib/profile-canonicalizer');
      await canonicalizeProfile(userId);
      console.log('✅ Rebuilt canonical profile after document deletion');
    } catch (canonicalizeError: any) {
      // Log but don't fail - canonicalization can happen later
      console.error('⚠️ Error rebuilding canonical profile:', canonicalizeError.message);
    }

    console.log('✅ Document deleted successfully:', documentId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('❌ Delete error:', error);

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
