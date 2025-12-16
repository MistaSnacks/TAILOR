import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';
import { formatResumeForAts, normalizeResumeContent } from '@/lib/resume-content';
import { ingestDocument } from '@/lib/rag/ingest';

// Type for job data from Supabase join
type JobData = {
  title?: string;
  company?: string;
} | null;

// Type for resume with job join
type ResumeWithJob = {
  id: string;
  content: string | null;
  user_id: string;
  created_at: string;
  job: JobData;
};

// Helper to sanitize filename (remove invalid characters)
function sanitizeFilename(filename: string): string {
  // Remove or replace invalid filename characters: < > : " / \ | ? *
  // Also remove leading/trailing dots and spaces
  return filename
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/^\.+|\.+$/g, '')
    .trim()
    .slice(0, 255); // Limit length
}

/**
 * Add Resume to Documents API
 * 
 * POST /api/resumes/[id]/add-to-docs
 *   - Creates a document record from the resume content
 *   - Ingests the document into the user's career profile
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('📄 Add Resume to Docs API - POST request received');

  try {
    const userId = await requireAuth();
    const { id: resumeId } = await params;

    console.log('🔐 Add to Docs API - User:', userId, 'Resume:', resumeId);

    // Fetch the resume (resume_versions table with job details via join)
    const { data: resume, error: resumeError } = await supabaseAdmin
      .from('resume_versions')
      .select(`
        id, 
        content, 
        user_id, 
        created_at,
        job:jobs!resume_versions_job_id_fkey (
          title,
          company
        )
      `)
      .eq('id', resumeId)
      .eq('user_id', userId)
      .single();

    if (resumeError || !resume) {
      console.error('❌ Resume not found:', resumeError);
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      );
    }

    // Null-check resume content before processing
    // Content can be a JSON object (from JSONB) or a string
    if (!resume.content) {
      console.error('❌ Resume content is null or invalid');
      return NextResponse.json(
        { error: 'Resume content is missing or invalid' },
        { status: 400 }
      );
    }

    // Normalize and format the resume content as text for ingestion
    // normalizeResumeContent handles both string and object content
    const normalizedContent = normalizeResumeContent(resume.content);
    const textContent = formatResumeForAts(normalizedContent);

    if (!textContent || textContent.trim().length < 50) {
      return NextResponse.json(
        { error: 'Resume content is too short to ingest' },
        { status: 400 }
      );
    }

    // Create filename from job info (job is joined object from Supabase)
    const jobData = resume.job as JobData;
    const jobTitle = jobData?.title || 'Untitled';
    const company = jobData?.company || 'Unknown Company';
    const dateStr = new Date(resume.created_at).toISOString().split('T')[0];
    const rawFileName = `Generated Resume - ${jobTitle} at ${company} (${dateStr}).txt`;
    // Sanitize filename to avoid invalid characters
    const fileName = sanitizeFilename(rawFileName);

    // Check if this resume was already added to docs
    const { data: existingDoc } = await supabaseAdmin
      .from('documents')
      .select('id')
      .eq('user_id', userId)
      .eq('source_resume_id', resumeId)
      .maybeSingle();

    if (existingDoc) {
      console.log('⚠️ Resume already added to docs:', existingDoc.id);
      return NextResponse.json(
        {
          error: 'This resume has already been added to your documents',
          documentId: existingDoc.id
        },
        { status: 409 }
      );
    }

    // Create document record
    console.log('📝 Creating document record from resume...');
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        user_id: userId,
        file_name: fileName,
        file_type: 'text/plain',
        file_size: new Blob([textContent]).size,
        storage_path: null, // No file stored, content is inline
        parse_status: 'processing',
        source_resume_id: resumeId, // Link back to original resume
        document_type: 'generated_resume',
      })
      .select()
      .single();

    if (docError) {
      console.error('❌ Failed to create document:', docError);
      return NextResponse.json(
        { error: 'Failed to create document record', details: docError.message },
        { status: 500 }
      );
    }

    console.log('✅ Document created:', document.id);

    // Ingest the document
    try {
      console.log('🚀 Starting ingestion...');
      // Note: ingestDocument expects DocumentMetadata, but we're passing custom metadata
      // The structuredData option is available for custom data
      await ingestDocument(document.id, textContent, userId, {
        structuredData: {
          source: 'generated_resume',
          originalResumeId: resumeId,
          jobTitle,
          company,
        },
      });

      // Update document status (verify operation result)
      const { error: updateError } = await supabaseAdmin
        .from('documents')
        .update({
          parse_status: 'completed',
          parsed_content: {
            sanitizedText: textContent,
            metadata: {
              source: 'generated_resume',
              originalResumeId: resumeId,
            }
          }
        })
        .eq('id', document.id);

      if (updateError) {
        console.error('⚠️ Failed to update document status after ingestion:', updateError);
        // Don't fail the request, but log the error
      }

      console.log('✅ Ingestion completed successfully');

      return NextResponse.json({
        success: true,
        message: 'Resume added to documents and ingested into your career profile',
        documentId: document.id,
        fileName,
      });
    } catch (ingestError: unknown) {
      const errorMessage = ingestError instanceof Error ? ingestError.message : 'Unknown error';
      const errorName = ingestError instanceof Error ? ingestError.name : 'Error';

      console.error('❌ Ingestion failed:', {
        error: errorMessage,
        name: errorName,
        documentId: document.id,
        timestamp: new Date().toISOString(),
      });

      // Update document status to failed (verify operation result)
      const { error: statusUpdateError } = await supabaseAdmin
        .from('documents')
        .update({ parse_status: 'failed' })
        .eq('id', document.id);

      if (statusUpdateError) {
        console.error('⚠️ Failed to update document status to failed:', statusUpdateError);
      }

      return NextResponse.json(
        {
          error: 'Failed to ingest document',
          details: errorMessage,
          documentId: document.id
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    // Proper error type checking instead of fragile string comparison
    const isUnauthorizedError = error instanceof Error && error.message === 'Unauthorized';
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('❌ Add to Docs API error:', {
      error: errorMessage,
      name: error instanceof Error ? error.name : 'Error',
      timestamp: new Date().toISOString(),
    });

    if (isUnauthorizedError) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', message: errorMessage },
      { status: 500 }
    );
  }
}

