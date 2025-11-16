import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, company, description } = body;

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Get user from session (placeholder for now)
    const userId = 'placeholder-user-id';

    // Extract skills from description (simple keyword extraction)
    const skillKeywords = [
      'javascript', 'typescript', 'python', 'java', 'react', 'node',
      'aws', 'docker', 'kubernetes', 'sql', 'nosql', 'agile', 'scrum',
    ];
    
    const requiredSkills = skillKeywords.filter((skill) =>
      description.toLowerCase().includes(skill)
    );

    const { data: job, error } = await supabaseAdmin
      .from('jobs')
      .insert({
        user_id: userId,
        title,
        company,
        description,
        required_skills: requiredSkills,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to create job' },
        { status: 500 }
      );
    }

    return NextResponse.json({ job });
  } catch (error) {
    console.error('Job creation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = 'placeholder-user-id';

    const { data: jobs, error } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch jobs' },
        { status: 500 }
      );
    }

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

