import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { chatWithDocuments } from '@/lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, history = [] } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const userId = 'placeholder-user-id';

    // Fetch user documents for context
    const { data: documents, error: docsError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .eq('parse_status', 'completed');

    if (docsError) {
      console.error('Documents fetch error:', docsError);
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      );
    }

    // Collect file URIs for Gemini
    const fileUris = documents
      ?.filter((doc: any) => doc.gemini_file_uri)
      .map((doc: any) => doc.gemini_file_uri) || [];

    // Format conversation history
    const conversationHistory = history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Get response from Gemini
    const response = await chatWithDocuments(
      message,
      conversationHistory,
      fileUris
    );

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

