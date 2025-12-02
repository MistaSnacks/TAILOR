#!/usr/bin/env tsx
/**
 * Re-ingest Documents Script
 * 
 * Re-ingests all completed documents or a specific document.
 * 
 * Usage:
 *   npx tsx scripts/reingest.ts                    # Re-ingest all documents for all users
 *   npx tsx scripts/reingest.ts <userId>           # Re-ingest all documents for a specific user
 *   npx tsx scripts/reingest.ts <userId> <docId>   # Re-ingest a specific document
 *   npx tsx scripts/reingest.ts --help             # Show this help message
 *   npx tsx scripts/reingest.ts --dry-run          # Preview what would be ingested
 * 
 * Requires:
 *   npm install -D tsx
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// Parse command line arguments
const args = process.argv.slice(2);
const showHelp = args.includes('--help') || args.includes('-h');
const dryRun = args.includes('--dry-run');
const filteredArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));

if (showHelp) {
    console.log(`
📋 Re-ingest Documents Script

Usage:
  npx tsx scripts/reingest.ts                    # Re-ingest all documents for all users
  npx tsx scripts/reingest.ts <userId>           # Re-ingest all documents for a specific user
  npx tsx scripts/reingest.ts <userId> <docId>   # Re-ingest a specific document
  npx tsx scripts/reingest.ts --help             # Show this help message
  npx tsx scripts/reingest.ts --dry-run          # Preview what would be ingested (no changes made)

Options:
  --help, -h     Show this help message
  --dry-run      Preview documents without ingesting

What gets re-ingested:
  ✅ Experiences and bullets (with embeddings)
  ✅ Skills (normalized and deduped)
  ✅ Education (with start/end dates)
  ✅ Certifications
  ✅ Contact information (name, email, phone, linkedin, portfolio)
  ❌ Address (intentionally excluded for privacy)

Examples:
  npx tsx scripts/reingest.ts
  npx tsx scripts/reingest.ts cd78e0f4-6563-4973-a88c-735c1e1d6a0b
  npx tsx scripts/reingest.ts cd78e0f4-6563-4973-a88c-735c1e1d6a0b c98140f9-de4a-456c-9376-d116151f643e
  npx tsx scripts/reingest.ts --dry-run
`);
    process.exit(0);
}

type IngestModule = typeof import('../lib/rag/ingest');
let ingestDocument: IngestModule['ingestDocument'];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false
    }
});

async function reingestAllDocuments(userId: string | null = null, isDryRun: boolean = false) {
    console.log('🔄 Starting document re-ingestion...');
    if (isDryRun) {
        console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }
    
    let query = supabase
        .from('documents')
        .select('id, user_id, file_name, parse_status, parsed_content')
        .eq('parse_status', 'completed')
        .order('created_at', { ascending: false });
    
    if (userId) {
        query = query.eq('user_id', userId);
        console.log(`📋 Filtering for user: ${userId}`);
    }
    
    const { data: documents, error } = await query;
    
    if (error) {
        console.error('❌ Error fetching documents:', error);
        process.exit(1);
    }
    
    if (!documents || documents.length === 0) {
        console.log('✅ No completed documents found to re-ingest');
        return;
    }
    
    console.log(`📄 Found ${documents.length} document(s) to re-ingest\n`);
    
    // In dry-run mode, just list the documents
    if (isDryRun) {
        console.log('📋 Documents that would be re-ingested:');
        documents.forEach((doc, index) => {
            const parsedContent = doc.parsed_content as any;
            const hasText = !!(parsedContent?.sanitizedText?.trim());
            const status = hasText ? '✅' : '⚠️  (no text)';
            console.log(`   ${index + 1}. ${status} ${doc.file_name}`);
            console.log(`      ID: ${doc.id}`);
            console.log(`      User: ${doc.user_id}`);
        });
        console.log('\n💡 Run without --dry-run to process these documents');
        return;
    }
    
    const results = {
        processed: documents.length,
        succeeded: 0,
        failed: 0,
        errors: [] as Array<{ documentId: string; fileName: string; error: string }>
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
                    error: 'No text content found in parsed_content'
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
                error: error.message || 'Unknown error'
            });
        }
    }
    
    console.log('\n📊 Results:');
    console.log(`   Processed: ${results.processed}`);
    console.log(`   Succeeded: ${results.succeeded}`);
    console.log(`   Failed: ${results.failed}`);
    
    if (results.errors.length > 0) {
        console.log('\n❌ Errors:');
        results.errors.forEach(err => {
            console.log(`   - ${err.fileName}: ${err.error}`);
        });
    }
}

async function reingestSingleDocument(userId: string, documentId: string) {
    console.log(`🔄 Re-ingesting document: ${documentId}`);
    
    const { data: document, error } = await supabase
        .from('documents')
        .select('id, user_id, file_name, parse_status, parsed_content')
        .eq('id', documentId)
        .eq('user_id', userId)
        .single();
    
    if (error || !document) {
        console.error('❌ Document not found:', error);
        process.exit(1);
    }
    
    if (document.parse_status !== 'completed') {
        console.error(`❌ Document status is "${document.parse_status}", not "completed"`);
        process.exit(1);
    }
    
    console.log(`📄 Document: ${document.file_name}`);
    
    const parsedContent = document.parsed_content as any;
    const text = parsedContent?.sanitizedText || '';
    
    if (!text || text.trim().length === 0) {
        console.error('❌ No text content found in document');
        process.exit(1);
    }
    
    const metadata = parsedContent?.metadata;
    const analysis = parsedContent?.analysis;
    const chunkCount = parsedContent?.chunk_count;
    
    try {
        await ingestDocument(document.id, text, document.user_id, {
            metadata,
            analysis,
            chunkCount,
        });
        
        console.log('✅ Successfully re-ingested document');
    } catch (error: any) {
        console.error('❌ Error ingesting document:', error);
        process.exit(1);
    }
}

async function main() {
    if (!ingestDocument && !dryRun) {
        const module: IngestModule = await import('../lib/rag/ingest');
        ingestDocument = module.ingestDocument;
    }

    const userId = filteredArgs[0] || null;
    const documentId = filteredArgs[1] || null;
    
    if (documentId) {
        if (!userId) {
            console.error('❌ User ID is required when specifying a document ID');
            process.exit(1);
        }
        if (dryRun) {
            console.log('🔍 DRY RUN: Would re-ingest single document');
            console.log(`   User: ${userId}`);
            console.log(`   Document: ${documentId}`);
            return;
        }
        await reingestSingleDocument(userId, documentId);
    } else {
        await reingestAllDocuments(userId, dryRun);
    }
}

main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});

