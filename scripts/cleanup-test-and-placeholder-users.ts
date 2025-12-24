#!/usr/bin/env tsx
/**
 * Cleanup Test and Placeholder Users Script
 * 
 * Identifies and removes:
 * 1. Test.com users (seeded test accounts)
 * 2. Placeholder users (created automatically when user not found)
 *    - Pattern: user_XXXXXXXX@example.invalid
 *    - Pattern: test-b0000000-0000-... (UUID-based test accounts)
 * 
 * Usage:
 *   npx tsx scripts/cleanup-test-and-placeholder-users.ts --list              # List all test/placeholder users
 *   npx tsx scripts/cleanup-test-and-placeholder-users.ts --delete-all        # Delete all test/placeholder users
 *   npx tsx scripts/cleanup-test-and-placeholder-users.ts --delete-test-com   # Delete only test.com users
 *   npx tsx scripts/cleanup-test-and-placeholder-users.ts --delete-placeholders # Delete only placeholder users
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

const ADMIN_EMAILS = [
    'cmcmath89@gmail.com',
    'camren@gettailor.ai'
];

/**
 * Check if email is a test.com user
 */
function isTestComUser(email: string | null): boolean {
    if (!email) return false;
    return email.toLowerCase().endsWith('@test.com');
}

/**
 * Check if email is a placeholder user
 * Placeholder users are created automatically when a user is not found
 * Patterns:
 * - user_XXXXXXXX@example.invalid (from profile-canonicalizer.ts)
 * - test-b0000000-0000-... (UUID-based test accounts)
 */
function isPlaceholderUser(email: string | null, name: string | null): boolean {
    if (!email) return false;
    const lowerEmail = email.toLowerCase();
    const lowerName = (name || '').toLowerCase();
    
    // Pattern 1: user_XXXXXXXX@example.invalid (from profile-canonicalizer.ts)
    if (lowerEmail.includes('@example.invalid')) {
        return true;
    }
    
    // Pattern 2: test-b0000000-0000-... (UUID-based test accounts)
    if (lowerEmail.startsWith('test-') && lowerEmail.includes('@')) {
        return true;
    }
    
    // Pattern 3: user_XXXXXXXX@place... (truncated in UI)
    if (lowerEmail.startsWith('user_') && lowerEmail.includes('@place')) {
        return true;
    }
    
    // Pattern 4: No name and suspicious email pattern
    if (!name || name.toLowerCase() === 'no name') {
        if (lowerEmail.match(/^user_[a-f0-9]+@/)) {
            return true;
        }
    }
    
    return false;
}

/**
 * Get user statistics before deletion
 */
async function getUserStats(userId: string) {
    const [
        { count: documents },
        { count: resumes },
        { count: jobs },
        { count: experiences },
        { count: skills },
        { count: chatThreads }
    ] = await Promise.all([
        supabaseAdmin.from('documents').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabaseAdmin.from('resume_versions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabaseAdmin.from('jobs').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabaseAdmin.from('experiences').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabaseAdmin.from('skills').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabaseAdmin.from('chat_threads').select('*', { count: 'exact', head: true }).eq('user_id', userId)
    ]);

    return {
        documents: documents || 0,
        resumes: resumes || 0,
        jobs: jobs || 0,
        experiences: experiences || 0,
        skills: skills || 0,
        chatThreads: chatThreads || 0
    };
}

/**
 * List all test and placeholder users
 */
async function listTestAndPlaceholderUsers() {
    console.log('🔍 Finding test.com and placeholder users...\n');

    const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('id, email, name, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error fetching users:', error);
        return;
    }

    if (!users || users.length === 0) {
        console.log('✅ No users found');
        return;
    }

    const testComUsers = users.filter(user => isTestComUser(user.email));
    const placeholderUsers = users.filter(user => isPlaceholderUser(user.email, user.name));

    if (testComUsers.length === 0 && placeholderUsers.length === 0) {
        console.log('✅ No test.com or placeholder users found');
        return;
    }

    if (testComUsers.length > 0) {
        console.log(`📋 Found ${testComUsers.length} test.com user(s):\n`);
        testComUsers.forEach((user, index) => {
            console.log(`${(index + 1).toString().padStart(2, ' ')}. ${user.name || 'No name'}`);
            console.log(`    Email: ${user.email}`);
            console.log(`    ID: ${user.id}`);
            console.log(`    Created: ${new Date(user.created_at).toLocaleDateString()}`);
            console.log('');
        });
    }

    if (placeholderUsers.length > 0) {
        console.log(`\n📋 Found ${placeholderUsers.length} placeholder user(s):\n`);
        placeholderUsers.forEach((user, index) => {
            console.log(`${(index + 1).toString().padStart(2, ' ')}. ${user.name || 'No name'}`);
            console.log(`    Email: ${user.email}`);
            console.log(`    ID: ${user.id}`);
            console.log(`    Created: ${new Date(user.created_at).toLocaleDateString()}`);
            console.log('');
        });
    }
}

/**
 * Delete all test.com users
 */
async function deleteTestComUsers() {
    console.log('🗑️  Deleting all test.com users...\n');

    const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('id, email, name, created_at')
        .ilike('email', '%@test.com');

    if (error) {
        console.error('❌ Error fetching test.com users:', error);
        process.exit(1);
    }

    if (!users || users.length === 0) {
        console.log('✅ No test.com users found');
        return;
    }

    // Filter out admin users (safety check)
    const usersToDelete = users.filter(user => 
        !ADMIN_EMAILS.some(adminEmail => 
            adminEmail.toLowerCase() === (user.email || '').toLowerCase()
        )
    );

    if (usersToDelete.length === 0) {
        console.log('✅ No test.com users to delete (all are admin users)');
        return;
    }

    console.log(`⚠️  Found ${usersToDelete.length} test.com user(s) to delete:\n`);
    usersToDelete.forEach((user, index) => {
        console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${user.name || 'No name'} (${user.email})`);
    });
    console.log('');

    const userIds = usersToDelete.map(u => u.id);
    const { error: deleteError } = await supabaseAdmin
        .from('users')
        .delete()
        .in('id', userIds);

    if (deleteError) {
        console.error('❌ Error deleting test.com users:', deleteError);
        process.exit(1);
    }

    console.log(`✅ Successfully deleted ${usersToDelete.length} test.com user(s) and all their data!`);
}

/**
 * Delete all placeholder users
 */
async function deletePlaceholderUsers() {
    console.log('🗑️  Deleting all placeholder users...\n');

    const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('id, email, name, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error fetching users:', error);
        process.exit(1);
    }

    if (!users || users.length === 0) {
        console.log('✅ No users found');
        return;
    }

    const placeholderUsers = users.filter(user => 
        isPlaceholderUser(user.email, user.name) &&
        !ADMIN_EMAILS.some(adminEmail => 
            adminEmail.toLowerCase() === (user.email || '').toLowerCase()
        )
    );

    if (placeholderUsers.length === 0) {
        console.log('✅ No placeholder users found');
        return;
    }

    console.log(`⚠️  Found ${placeholderUsers.length} placeholder user(s) to delete:\n`);
    placeholderUsers.forEach((user, index) => {
        console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${user.name || 'No name'} (${user.email})`);
    });
    console.log('');

    const userIds = placeholderUsers.map(u => u.id);
    const { error: deleteError } = await supabaseAdmin
        .from('users')
        .delete()
        .in('id', userIds);

    if (deleteError) {
        console.error('❌ Error deleting placeholder users:', deleteError);
        process.exit(1);
    }

    console.log(`✅ Successfully deleted ${placeholderUsers.length} placeholder user(s) and all their data!`);
}

/**
 * Delete all test.com and placeholder users
 */
async function deleteAllTestAndPlaceholderUsers() {
    console.log('🗑️  Deleting all test.com and placeholder users...\n');

    const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('id, email, name, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error fetching users:', error);
        process.exit(1);
    }

    if (!users || users.length === 0) {
        console.log('✅ No users found');
        return;
    }

    const testComUsers = users.filter(user => isTestComUser(user.email));
    const placeholderUsers = users.filter(user => isPlaceholderUser(user.email, user.name));
    
    const allUsersToDelete = [...testComUsers, ...placeholderUsers].filter(user =>
        !ADMIN_EMAILS.some(adminEmail => 
            adminEmail.toLowerCase() === (user.email || '').toLowerCase()
        )
    );

    // Remove duplicates by ID
    const uniqueUsers = Array.from(
        new Map(allUsersToDelete.map(u => [u.id, u])).values()
    );

    if (uniqueUsers.length === 0) {
        console.log('✅ No test.com or placeholder users to delete');
        return;
    }

    console.log(`⚠️  Found ${uniqueUsers.length} user(s) to delete:\n`);
    console.log(`   • ${testComUsers.length} test.com user(s)`);
    console.log(`   • ${placeholderUsers.length} placeholder user(s)\n`);
    
    uniqueUsers.forEach((user, index) => {
        const type = isTestComUser(user.email) ? 'test.com' : 'placeholder';
        console.log(`   ${(index + 1).toString().padStart(2, ' ')}. [${type}] ${user.name || 'No name'} (${user.email})`);
    });
    console.log('');

    const userIds = uniqueUsers.map(u => u.id);
    const { error: deleteError } = await supabaseAdmin
        .from('users')
        .delete()
        .in('id', userIds);

    if (deleteError) {
        console.error('❌ Error deleting users:', deleteError);
        process.exit(1);
    }

    console.log(`✅ Successfully deleted ${uniqueUsers.length} user(s) and all their data!`);
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage:');
        console.log('  npx tsx scripts/cleanup-test-and-placeholder-users.ts --list              # List all test/placeholder users');
        console.log('  npx tsx scripts/cleanup-test-and-placeholder-users.ts --delete-all        # Delete all test/placeholder users');
        console.log('  npx tsx scripts/cleanup-test-and-placeholder-users.ts --delete-test-com   # Delete only test.com users');
        console.log('  npx tsx scripts/cleanup-test-and-placeholder-users.ts --delete-placeholders # Delete only placeholder users');
        process.exit(1);
    }

    if (args[0] === '--list') {
        await listTestAndPlaceholderUsers();
        return;
    }

    if (args[0] === '--delete-all') {
        await deleteAllTestAndPlaceholderUsers();
        return;
    }

    if (args[0] === '--delete-test-com') {
        await deleteTestComUsers();
        return;
    }

    if (args[0] === '--delete-placeholders') {
        await deletePlaceholderUsers();
        return;
    }

    console.error('❌ Unknown command:', args[0]);
    process.exit(1);
}

main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});



