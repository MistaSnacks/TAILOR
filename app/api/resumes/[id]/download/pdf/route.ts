import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-utils';
import { generateResumePdf } from '@/lib/pdf-generator';
import { normalizeResumeContent } from '@/lib/resume-content';

// CRITICAL: @react-pdf/renderer requires Node.js runtime (not Edge)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// 🔑 Environment variable logging (REMOVE IN PRODUCTION)
console.log('📥 PDF Download API - Environment check:', {
  supabase: !!supabaseAdmin ? '✅' : '❌',
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Await params in Next.js 15
  const { id } = await params;
  console.log('📥 PDF Download API - GET request for resume:', id);

  try {
    // Get authenticated user
    const userId = await requireAuth();
    console.log('🔐 PDF Download API - User authenticated:', userId ? '✅' : '❌');

    const resumeId = id;

    // Fetch resume version
    const { data: resume, error } = await supabaseAdmin
      .from('resume_versions')
      .select(`
        *,
        job:jobs(*)
      `)
      .eq('id', resumeId)
      .eq('user_id', userId)
      .single();

    if (error || !resume) {
      console.error('Resume not found:', error);
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      );
    }

    console.log('📄 Generating PDF for resume:', {
      id: resume.id,
      template: resume.template,
      jobTitle: resume.job?.title,
    });

    // Parse and normalize resume content
    const resumeData = normalizeResumeContent(resume.content);

    // Add job info to contact if available
    if (resume.job && !resumeData.contact) {
      resumeData.contact = {
        name: 'Your Name',
      };
    }

    // Generate PDF
    const buffer = await generateResumePdf(resumeData, resume.template);

    // Create filename
    const jobTitle = resume.job?.title || 'Resume';
    const filename = `${jobTitle.replace(/[^a-z0-9]/gi, '_')}_${resume.template}.pdf`;

    console.log('✅ PDF generated:', filename);

    // Return file
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('❌ PDF Download error:', error);

    if (error.message === 'Unauthorized') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to generate PDF resume' },
      { status: 500 }
    );
  }
}



