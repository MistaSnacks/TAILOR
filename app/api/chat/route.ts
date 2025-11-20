import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { chatWithDocuments } from '@/lib/gemini';
import { requireAuth } from '@/lib/auth-utils';
import { getRelevantChunks, mapChunksToFileRefs } from '@/lib/chunking';

// 🔑 Environment variable logging (REMOVE IN PRODUCTION)
console.log('💬 Chat API - Environment check:', {
  supabase: !!supabaseAdmin ? '✅' : '❌',
  gemini: process.env.GEMINI_API_KEY ? '✅' : '❌',
});

export async function POST(request: NextRequest) {
  console.log('💬 Chat API - POST request received');
  
  try {
    // Get authenticated user
    const userId = await requireAuth();
    console.log('🔐 Chat API - User authenticated:', userId ? '✅' : '❌');

    const body = await request.json();
    const { message, history = [] } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

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
    const documentFileRefs = documents
      ?.filter((doc: any) => doc.gemini_file_uri)
      .map((doc: any) => ({
        uri: doc.gemini_file_uri,
        mimeType: doc.file_type || 'application/octet-stream',
      })) || [];

    const { chunks: relevantChunks } = await getRelevantChunks(userId, message, 6);
    console.log('🔍 Chat chunk hits:', relevantChunks.length);
    const chunkTexts = relevantChunks.map((chunk) => chunk.content);
    const chunkFileRefs = mapChunksToFileRefs(relevantChunks);

    // Format conversation history
    const conversationHistory = history.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Get response from Gemini
    const response = await chatWithDocuments(message, conversationHistory, {
      documentFiles: documentFileRefs,
      chunkTexts,
      chunkFileReferences: chunkFileRefs,
    });

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('❌ Chat error:', error);
    
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

