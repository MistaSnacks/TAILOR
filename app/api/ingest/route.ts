import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { ingestDocument } from '@/lib/rag/ingest';
import { requireAuth } from '@/lib/auth-utils';
import { canonicalizeProfile } from '@/lib/profile-canonicalizer';

/**
 * Manual Document Ingestion API
 * 
 * POST /api/ingest
 *   - Re-ingests all completed documents for the authenticated user
 * 
 * POST /api/ingest?documentId=<id>
 *   - Re-ingests a specific document
 */
export async function POST(request: NextRequest) {
  console.log('🔄 Manual Ingestion API - POST request received');

  try {
    const userId = await requireAuth();
    console.log('🔐 Manual Ingestion API - User authenticated:', userId);

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (documentId) {
      // Ingest a specific document
      return await ingestSingleDocument(userId, documentId);
    } else {
      // Ingest all documents for the user
      return await ingestAllDocuments(userId);
    }
  } catch (error: any) {
    console.error('❌ Manual Ingestion API error:', error);

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: error.message, stack: error.stack },
      { status: 500 }
    );
  }
}

async function ingestSingleDocument(userId: string, documentId: string) {
  console.log(`📄 Ingesting single document: ${documentId}`);

  const { data: document, error: docError } = await supabaseAdmin
    .from('documents')
    .select('id, user_id, file_name, parse_status, parsed_content')
    .eq('id', documentId)
    .eq('user_id', userId)
    .single();

  if (docError || !document) {
    return NextResponse.json(
      { error: 'Document not found' },
      { status: 404 }
    );
  }

  if (document.parse_status !== 'completed') {
    return NextResponse.json(
      { error: `Document status is "${document.parse_status}", not "completed"` },
      { status: 400 }
    );
  }

  const parsedContent = document.parsed_content as any;
  const text = parsedContent?.sanitizedText || '';

  if (!text || text.trim().length === 0) {
    return NextResponse.json(
      { error: 'No text content found in document' },
      { status: 400 }
    );
  }

  const metadata = parsedContent?.metadata;
  const analysis = parsedContent?.analysis;
  const chunkCount = parsedContent?.chunk_count;

  try {
    await ingestDocument(document.id, text, userId, {
      metadata,
      analysis,
      chunkCount,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully re-ingested document: ${document.file_name}`,
      documentId: document.id,
    });
  } catch (error: any) {
    console.error('❌ Ingestion error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to ingest document', 
        message: error.message,
        code: error.code,
        details: error.details,
        stack: error.stack,
      },
      { status: 500 }
    );
  }
}

async function ingestAllDocuments(userId: string) {
  console.log(`📋 Ingesting all documents for user: ${userId}`);

  const { data: documents, error } = await supabaseAdmin
    .from('documents')
    .select('id, user_id, file_name, parse_status, parsed_content')
    .eq('user_id', userId)
    .eq('parse_status', 'completed')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch documents', details: error.message },
      { status: 500 }
    );
  }

  if (!documents || documents.length === 0) {
    return NextResponse.json({
      success: true,
      message: 'No completed documents found to ingest',
      processed: 0,
      succeeded: 0,
      failed: 0,
    });
  }

  console.log(`📄 Found ${documents.length} document(s) to re-ingest`);

  const results = {
    processed: documents.length,
    succeeded: 0,
    failed: 0,
    errors: [] as Array<{ documentId: string; fileName: string; error: string }>,
  };

  for (const doc of documents) {
    try {
      console.log(`🔄 Processing: ${doc.file_name} (${doc.id})`);

      const parsedContent = doc.parsed_content as any;
      const text = parsedContent?.sanitizedText || '';

      if (!text || text.trim().length === 0) {
        console.log(`   ⚠️  Skipping: No text content found`);
        results.failed++;
        results.errors.push({
          documentId: doc.id,
          fileName: doc.file_name,
          error: 'No text content found in parsed_content',
        });
        continue;
      }

      const metadata = parsedContent?.metadata;
      const analysis = parsedContent?.analysis;
      const chunkCount = parsedContent?.chunk_count;

      await ingestDocument(doc.id, text, doc.user_id, {
        metadata,
        analysis,
        chunkCount,
      });

      console.log(`   ✅ Successfully ingested`);
      results.succeeded++;
    } catch (error: any) {
      console.error(`   ❌ Error ingesting ${doc.file_name}:`, error.message);
      results.failed++;
      results.errors.push({
        documentId: doc.id,
        fileName: doc.file_name,
        error: error.message || 'Unknown error',
      });
    }
  }

  // After ingestion, trigger canonicalization to merge duplicate experiences
  try {
    console.log('🔄 Triggering profile canonicalization...');
    const canonicalProfile = await canonicalizeProfile(userId);
    console.log(`✅ Canonicalized: ${canonicalProfile.experiences.length} experiences, ${canonicalProfile.skills.length} skills`);
    
    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} document(s), canonicalized ${canonicalProfile.experiences.length} experiences`,
      ...results,
      canonicalization: {
        experiences: canonicalProfile.experiences.length,
        skills: canonicalProfile.skills.length,
      },
    });
  } catch (canonError: any) {
    console.error('⚠️ Canonicalization failed (ingestion still succeeded):', canonError.message);
    
    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} document(s), but canonicalization failed`,
      ...results,
      canonicalizationError: canonError.message,
    });
  }
}

