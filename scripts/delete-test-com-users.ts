#!/usr/bin/env tsx
/**
 * Delete Test.com Users Script
 * 
 * Safely deletes users with @test.com email domain and all their associated data.
 * Due to ON DELETE CASCADE constraints, deleting a user will automatically
 * delete all related data (documents, resumes, jobs, experiences, etc.)
 * 
 * Usage:
 *   npx tsx scripts/delete-test-com-users.ts --list              # List all test.com users
 *   npx tsx scripts/delete-test-com-users.ts --delete-all        # Delete all test.com users
 *   npx tsx scripts/delete-test-com-users.ts <email>            # Delete specific user by email
 *   npx tsx scripts/delete-test-com-users.ts --id <userId>      # Delete by user ID
 *   npx tsx scripts/delete-test-com-users.ts --dry-run <email>   # Preview what would be deleted
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
 * List all test.com users
 */
async function listTestComUsers() {
    console.log('🔍 Finding test.com users...\n');

    const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('id, email, name, created_at')
        .ilike('email', '%@test.com')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error fetching test.com users:', error);
        return;
    }

    if (!users || users.length === 0) {
        console.log('✅ No test.com users found');
        return;
    }

    console.log(`📋 Found ${users.length} test.com user(s):\n`);
    users.forEach((user, index) => {
        console.log(`${(index + 1).toString().padStart(2, ' ')}. ${user.name || 'No name'}`);
        console.log(`    Email: ${user.email}`);
        console.log(`    ID: ${user.id}`);
        console.log(`    Created: ${new Date(user.created_at).toLocaleDateString()}`);
        console.log('');
    });
}

/**
 * Preview what would be deleted (dry run)
 */
async function previewDeletion(userId: string, email: string, name: string) {
    console.log('🔍 DRY RUN - Previewing deletion...\n');
    console.log(`User: ${name || 'No name'} (${email})`);
    console.log(`ID: ${userId}\n`);

    const stats = await getUserStats(userId);
    
    console.log('📊 Data that would be deleted:');
    console.log(`   • Documents: ${stats.documents}`);
    console.log(`   • Resumes: ${stats.resumes}`);
    console.log(`   • Jobs: ${stats.jobs}`);
    console.log(`   • Experiences: ${stats.experiences}`);
    console.log(`   • Skills: ${stats.skills}`);
    console.log(`   • Chat Threads: ${stats.chatThreads}`);
    console.log(`   • Profile data (via CASCADE)`);
    console.log(`   • All related data (via CASCADE)\n`);
    console.log('⚠️  This is a DRY RUN - no data was deleted');
}

/**
 * Delete a user
 */
async function deleteUser(userId: string, email: string, name: string, dryRun: boolean = false) {
    // Safety check: prevent deleting admin users
    if (ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === email.toLowerCase())) {
        console.error('❌ Cannot delete admin user:', email);
        console.error('   Admin emails are protected from deletion');
        process.exit(1);
    }

    if (dryRun) {
        await previewDeletion(userId, email, name);
        return;
    }

    console.log('🗑️  Deleting user and all associated data...\n');
    console.log(`User: ${name || 'No name'} (${email})`);
    console.log(`ID: ${userId}\n`);

    const stats = await getUserStats(userId);
    
    console.log('📊 Data to be deleted:');
    console.log(`   • Documents: ${stats.documents}`);
    console.log(`   • Resumes: ${stats.resumes}`);
    console.log(`   • Jobs: ${stats.jobs}`);
    console.log(`   • Experiences: ${stats.experiences}`);
    console.log(`   • Skills: ${stats.skills}`);
    console.log(`   • Chat Threads: ${stats.chatThreads}`);
    console.log(`   • Profile data (via CASCADE)`);
    console.log(`   • All related data (via CASCADE)\n`);

    // Delete user (CASCADE will handle related data)
    const { error } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', userId);

    if (error) {
        console.error('❌ Error deleting user:', error);
        process.exit(1);
    }

    console.log('✅ User deleted successfully!');
    console.log('✅ All associated data has been automatically deleted via CASCADE');
}

/**
 * Delete all test.com users
 */
async function deleteAllTestComUsers() {
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

    if (usersToDelete.length < users.length) {
        console.log(`⚠️  Skipping ${users.length - usersToDelete.length} admin user(s)\n`);
    }

    console.log(`⚠️  Found ${usersToDelete.length} test.com user(s) to delete:\n`);
    usersToDelete.forEach((user, index) => {
        console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${user.name || 'No name'} (${user.email})`);
    });
    console.log('');

    // Delete all test.com users
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
 * Find user by email
 */
async function findUserByEmail(email: string) {
    const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, email, name, created_at')
        .eq('email', email)
        .maybeSingle();

    if (error) {
        console.error('❌ Error finding user:', error);
        process.exit(1);
    }

    return data;
}

/**
 * Find user by ID
 */
async function findUserById(userId: string) {
    const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, email, name, created_at')
        .eq('id', userId)
        .maybeSingle();

    if (error) {
        console.error('❌ Error finding user:', error);
        process.exit(1);
    }

    return data;
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage:');
        console.log('  npx tsx scripts/delete-test-com-users.ts --list              # List all test.com users');
        console.log('  npx tsx scripts/delete-test-com-users.ts --delete-all        # Delete all test.com users');
        console.log('  npx tsx scripts/delete-test-com-users.ts <email>              # Delete by email');
        console.log('  npx tsx scripts/delete-test-com-users.ts --id <userId>        # Delete by user ID');
        console.log('  npx tsx scripts/delete-test-com-users.ts --dry-run <email>  # Preview deletion');
        process.exit(1);
    }

    if (args[0] === '--list') {
        await listTestComUsers();
        return;
    }

    if (args[0] === '--delete-all') {
        await deleteAllTestComUsers();
        return;
    }

    const isDryRun = args[0] === '--dry-run';
    const isById = args[0] === '--id';
    
    let user;
    
    if (isDryRun) {
        if (args.length < 2) {
            console.error('❌ Email required for dry run');
            process.exit(1);
        }
        user = await findUserByEmail(args[1]);
    } else if (isById) {
        if (args.length < 2) {
            console.error('❌ User ID required');
            process.exit(1);
        }
        user = await findUserById(args[1]);
    } else {
        user = await findUserByEmail(args[0]);
    }

    if (!user) {
        console.error('❌ User not found');
        process.exit(1);
    }

    // Verify it's a test.com user if deleting specific user
    if (!isDryRun && !isById && !isTestComUser(user.email || '')) {
        console.warn('⚠️  Warning: This user does not have a @test.com email');
        console.warn(`   Email: ${user.email}`);
        console.warn('   Use the delete-user.ts script for non-test.com users');
    }

    await deleteUser(user.id, user.email || '', user.name || null, isDryRun);
}

main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});



