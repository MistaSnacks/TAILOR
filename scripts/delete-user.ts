#!/usr/bin/env tsx
/**
 * Delete User Script
 * 
 * Safely deletes a user and all their associated data.
 * Due to ON DELETE CASCADE constraints, deleting a user will automatically
 * delete all related data (documents, resumes, jobs, experiences, etc.)
 * 
 * Usage:
 *   npx tsx scripts/delete-user.ts <email>              # Delete by email
 *   npx tsx scripts/delete-user.ts --id <userId>        # Delete by user ID
 *   npx tsx scripts/delete-user.ts --list-test          # List seeded test users
 *   npx tsx scripts/delete-user.ts --delete-all-seeded  # Delete all seeded test users
 *   npx tsx scripts/delete-user.ts --dry-run <email>    # Preview what would be deleted
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
 * Check if email is a seeded test user
 * Seeded test users use the @test.tailor.dev domain
 */
function isSeededTestUser(email: string | null): boolean {
    if (!email) return false;
    return email.toLowerCase().endsWith('@test.tailor.dev');
}

/**
 * Check if email is a test user (contains test, example, demo, etc.)
 * This is a broader check for any test-like users
 */
function isTestUser(email: string | null, name: string | null): boolean {
    if (!email) return false;
    
    // First check if it's a seeded test user
    if (isSeededTestUser(email)) {
        return true;
    }
    
    const lowerEmail = email.toLowerCase();
    const lowerName = (name || '').toLowerCase();
    
    const testPatterns = [
        'test',
        'example',
        'demo',
        'sample',
        'fake',
        'dummy',
        '@test.',
        '.test@'
    ];
    
    return testPatterns.some(pattern => 
        lowerEmail.includes(pattern) || lowerName.includes(pattern)
    );
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
 * List all seeded test users (from seed-test-profiles.sql)
 */
async function listTestUsers() {
    console.log('🔍 Finding seeded test users (@test.tailor.dev)...\n');

    const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('id, email, name, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('❌ Error fetching users:', error);
        return;
    }

    // Filter for seeded test users specifically
    const seededTestUsers = (users || []).filter(user => 
        isSeededTestUser(user.email)
    );

    // Also show other test-like users
    const otherTestUsers = (users || []).filter(user => 
        !isSeededTestUser(user.email) && isTestUser(user.email, user.name)
    );

    if (seededTestUsers.length === 0 && otherTestUsers.length === 0) {
        console.log('✅ No test users found');
        return;
    }

    if (seededTestUsers.length > 0) {
        console.log(`📋 Found ${seededTestUsers.length} seeded test user(s) (@test.tailor.dev):\n`);
        seededTestUsers.forEach((user, index) => {
            console.log(`${(index + 1).toString().padStart(2, ' ')}. ${user.name || 'No name'}`);
            console.log(`    Email: ${user.email}`);
            console.log(`    ID: ${user.id}`);
            console.log(`    Created: ${new Date(user.created_at).toLocaleDateString()}`);
            console.log('');
        });
    }

    if (otherTestUsers.length > 0) {
        console.log(`\n⚠️  Also found ${otherTestUsers.length} other test-like user(s):\n`);
        otherTestUsers.forEach((user, index) => {
            console.log(`${(index + 1).toString().padStart(2, ' ')}. ${user.name || 'No name'}`);
            console.log(`    Email: ${user.email}`);
            console.log(`    ID: ${user.id}`);
            console.log(`    Created: ${new Date(user.created_at).toLocaleDateString()}`);
            console.log('');
        });
    }
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

/**
 * Delete all seeded test users
 */
async function deleteAllSeededUsers() {
    console.log('🗑️  Deleting all seeded test users (@test.tailor.dev)...\n');

    const { data: users, error } = await supabaseAdmin
        .from('users')
        .select('id, email, name, created_at')
        .ilike('email', '%@test.tailor.dev');

    if (error) {
        console.error('❌ Error fetching seeded test users:', error);
        process.exit(1);
    }

    if (!users || users.length === 0) {
        console.log('✅ No seeded test users found');
        return;
    }

    console.log(`⚠️  Found ${users.length} seeded test user(s) to delete:\n`);
    users.forEach((user, index) => {
        console.log(`   ${(index + 1).toString().padStart(2, ' ')}. ${user.name || 'No name'} (${user.email})`);
    });
    console.log('');

    // Delete all seeded test users
    const userIds = users.map(u => u.id);
    const { error: deleteError } = await supabaseAdmin
        .from('users')
        .delete()
        .in('id', userIds);

    if (deleteError) {
        console.error('❌ Error deleting seeded test users:', deleteError);
        process.exit(1);
    }

    console.log(`✅ Successfully deleted ${users.length} seeded test user(s) and all their data!`);
}

async function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage:');
        console.log('  npx tsx scripts/delete-user.ts <email>              # Delete by email');
        console.log('  npx tsx scripts/delete-user.ts --id <userId>         # Delete by user ID');
        console.log('  npx tsx scripts/delete-user.ts --list-test           # List seeded test users');
        console.log('  npx tsx scripts/delete-user.ts --delete-all-seeded   # Delete all seeded test users');
        console.log('  npx tsx scripts/delete-user.ts --dry-run <email>     # Preview deletion');
        process.exit(1);
    }

    if (args[0] === '--list-test') {
        await listTestUsers();
        return;
    }

    if (args[0] === '--delete-all-seeded') {
        await deleteAllSeededUsers();
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

    await deleteUser(user.id, user.email || '', user.name || null, isDryRun);
}

main().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});

