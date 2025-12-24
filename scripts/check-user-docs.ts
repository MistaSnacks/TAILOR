#!/usr/bin/env tsx
/**
 * Check how many documents a specific user has
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false }
});

async function checkUserDocs(emailOrName: string) {
    console.log(`🔍 Looking up user: ${emailOrName}\n`);

    // Find user by email or name
    const { data: users, error: userError } = await supabaseAdmin
        .from('users')
        .select('id, email, name, created_at')
        .or(`email.ilike.%${emailOrName}%,name.ilike.%${emailOrName}%`)
        .limit(5);

    if (userError || !users || users.length === 0) {
        console.error('❌ User not found');
        return;
    }

    if (users.length > 1) {
        console.log('⚠️  Multiple users found. Showing all:\n');
    }

    for (const user of users) {
        console.log(`📋 User: ${user.name || 'No name'}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Created: ${new Date(user.created_at).toLocaleString()}\n`);

        // Count all documents
        const { count: totalDocs, error: totalError } = await supabaseAdmin
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        // Count documents by status
        const { data: docsByStatus, error: statusError } = await supabaseAdmin
            .from('documents')
            .select('parse_status, document_type')
            .eq('user_id', user.id);

        // Count documents by type
        const { data: docsByType, error: typeError } = await supabaseAdmin
            .from('documents')
            .select('document_type')
            .eq('user_id', user.id);

        if (totalError) {
            console.error('❌ Error counting documents:', totalError);
            continue;
        }

        console.log(`📄 Total Documents: ${totalDocs || 0}\n`);

        if (docsByStatus && docsByStatus.length > 0) {
            const statusCounts: Record<string, number> = {};
            const typeCounts: Record<string, number> = {};

            docsByStatus.forEach((doc: any) => {
                statusCounts[doc.parse_status] = (statusCounts[doc.parse_status] || 0) + 1;
                typeCounts[doc.document_type] = (typeCounts[doc.document_type] || 0) + 1;
            });

            console.log('   By Status:');
            Object.entries(statusCounts).forEach(([status, count]) => {
                console.log(`     • ${status}: ${count}`);
            });

            console.log('\n   By Type:');
            Object.entries(typeCounts).forEach(([type, count]) => {
                console.log(`     • ${type}: ${count}`);
            });

            // Show document details
            const { data: allDocs, error: docsError } = await supabaseAdmin
                .from('documents')
                .select('id, file_name, file_type, parse_status, document_type, created_at')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (!docsError && allDocs && allDocs.length > 0) {
                console.log('\n   Document Details:');
                allDocs.forEach((doc: any, index: number) => {
                    const date = new Date(doc.created_at).toLocaleDateString();
                    console.log(`     ${(index + 1).toString().padStart(2, ' ')}. ${doc.file_name.padEnd(40)} | ${doc.document_type.padEnd(15)} | ${doc.parse_status.padEnd(10)} | ${date}`);
                });
            }
        }

        if (users.length > 1) {
            console.log('\n' + '─'.repeat(60) + '\n');
        }
    }
}

const emailOrName = process.argv[2] || 'robert levy';
checkUserDocs(emailOrName).catch(console.error);



