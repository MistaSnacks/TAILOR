import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { parseDocument } from '@/lib/parse';
import { uploadFileToGemini } from '@/lib/gemini';
import { requireAuth } from '@/lib/auth-utils';

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
    try {
      console.log('📄 Parsing document...');
      const parsed = await parseDocument(buffer, file.type);
      console.log('✅ Document parsed, text length:', parsed.text.length);

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

      // Update document with parsed content
      await supabaseAdmin
        .from('documents')
        .update({
          parsed_content: {
            text: parsed.text,
            metadata: parsed.metadata,
          },
          parse_status: 'completed',
          gemini_file_uri: geminiFileUri,
        })
        .eq('id', document.id);
      
      console.log('✅ Document updated in database');
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

