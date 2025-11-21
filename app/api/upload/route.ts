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

      const chunks = chunkText(parsed.text, MAX_CHUNK_SIZE)
        .filter(chunk => chunk.trim().length >= MIN_CHUNK_LENGTH)
        .slice(0, MAX_CHUNKS_PER_DOCUMENT);
      console.log('✂️ Chunking document:', {
        chunkCount: chunks.length,
        maxChunks: MAX_CHUNKS_PER_DOCUMENT,
        chunkSize: MAX_CHUNK_SIZE,
      });

      // Upload to Gemini Files API
      let geminiFileUri = null;
      let geminiFileName = null;
      try {
        console.log('📤 Uploading to Gemini Files API...');
        const geminiFile = await uploadFileToGemini(buffer, file.type, file.name);
        geminiFileUri = geminiFile.uri;
        geminiFileName = geminiFile.name;
        console.log('✅ File uploaded to Gemini:', geminiFile.name);
      } catch (geminiError) {
        console.error('❌ Gemini upload error:', geminiError);
        // Don't fail the upload if Gemini upload fails
        // We still have the parsed content
      }

      // Build chunk payloads with embeddings + Gemini chunk files
      const chunkRecords: any[] = [];
      for (const [index, chunk] of chunks.entries()) {
        try {
          const embedding = await embedText(chunk);
          let chunkFile: { uri: string; mimeType: string } | null = null;

          try {
            const uploadedChunk = await uploadTextChunkToGemini(
              chunk,
              `${file.name}-chunk-${index + 1}.txt`
            );
            chunkFile = { uri: uploadedChunk.uri, mimeType: uploadedChunk.mimeType };
          } catch (chunkUploadError) {
            console.error('❌ Gemini chunk upload error:', chunkUploadError);
          }

          chunkRecords.push({
            document_id: document.id,
            chunk_index: index,
            content: chunk,
            chunk_size: chunk.length,
            gemini_file_uri: chunkFile?.uri || null,
            chunk_mime_type: chunkFile?.mimeType || 'text/plain',
            embedding,
          });
        } catch (embeddingError) {
          console.error('❌ Chunk embedding error:', embeddingError);
        }
      }

      if (chunkRecords.length > 0) {
        await supabaseAdmin.from('document_chunks').insert(chunkRecords);
      }

      // Update document with parsed content + chunk metadata
      await supabaseAdmin
        .from('documents')
        .update({
          parsed_content: {
            sanitizedText: parsed.text,
            metadata: parsed.metadata,
            analysis: parsed.analysis,
            chunk_count: chunkRecords.length,
          },
          parse_status: 'completed',
          gemini_file_uri: geminiFileUri,
          chunk_count: chunkRecords.length,
          last_chunked_at: new Date().toISOString(),
          document_type: parsed.analysis.type,
          has_placeholder_content: parsed.analysis.placeholder.flagged,
          placeholder_summary: parsed.analysis.placeholder,
        })
        .eq('id', document.id);

      console.log('✅ Document updated in database with chunks');

      // Trigger Atomic RAG ingestion
      try {
        console.log('🚀 Triggering Atomic RAG ingestion...');
        await ingestDocument(document.id, parsed.text, userId, {
          metadata: parsed.metadata,
          analysis: parsed.analysis,
          chunkCount: chunkRecords.length,
        });
        console.log('✅ Atomic RAG ingestion completed');
      } catch (ingestError) {
        console.error('❌ Ingestion error:', ingestError);
        // Don't fail the upload if ingestion fails
        // The document is still stored and can be re-ingested later
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

    // Delete document (cascades to chunks and other related data via ON DELETE CASCADE)
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
