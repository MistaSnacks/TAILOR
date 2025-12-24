#!/usr/bin/env tsx
/**
 * Show user statistics: total users, resumes, documents, and jobs
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

async function showUserStats() {
    console.log('📊 Fetching user statistics...\n');

    // Get total counts
    const [
        { count: totalUsers, error: usersError },
        { count: totalResumes, error: resumesError },
        { count: totalDocuments, error: documentsError },
        { count: totalJobs, error: jobsError }
    ] = await Promise.all([
        supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('resume_versions').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('documents').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('jobs').select('*', { count: 'exact', head: true })
    ]);

    if (usersError) {
        console.error('❌ Error fetching users:', usersError);
        return;
    }
    if (resumesError) {
        console.error('❌ Error fetching resumes:', resumesError);
        return;
    }
    if (documentsError) {
        console.error('❌ Error fetching documents:', documentsError);
        return;
    }
    if (jobsError) {
        console.error('❌ Error fetching jobs:', jobsError);
        return;
    }

    // Get all users
    const { data: users, error: usersError2 } = await supabaseAdmin
        .from('users')
        .select('id, email, name, created_at')
        .order('created_at', { ascending: false });

    if (usersError2 || !users) {
        console.error('❌ Error fetching users:', usersError2);
        return;
    }

    // Get all data to count per user
    const [
        { data: allResumes },
        { data: allDocuments },
        { data: allJobs }
    ] = await Promise.all([
        supabaseAdmin.from('resume_versions').select('user_id'),
        supabaseAdmin.from('documents').select('user_id'),
        supabaseAdmin.from('jobs').select('user_id')
    ]);

    // Count per user
    const resumeCounts: Record<string, number> = {};
    const documentCounts: Record<string, number> = {};
    const jobCounts: Record<string, number> = {};

    allResumes?.forEach((row: any) => {
        resumeCounts[row.user_id] = (resumeCounts[row.user_id] || 0) + 1;
    });

    allDocuments?.forEach((row: any) => {
        documentCounts[row.user_id] = (documentCounts[row.user_id] || 0) + 1;
    });

    allJobs?.forEach((row: any) => {
        jobCounts[row.user_id] = (jobCounts[row.user_id] || 0) + 1;
    });

    // Combine users with their counts
    const usersWithCounts = users.map((user: any) => ({
        ...user,
        resumeCount: resumeCounts[user.id] || 0,
        documentCount: documentCounts[user.id] || 0,
        jobCount: jobCounts[user.id] || 0,
        totalActivity: (resumeCounts[user.id] || 0) + (documentCounts[user.id] || 0) + (jobCounts[user.id] || 0)
    }));

    // Calculate statistics
    const usersWithActivity = usersWithCounts.filter(
        (user: any) => user.totalActivity > 0
    );
    const usersWithoutActivity = usersWithCounts.length - usersWithActivity.length;

    // Display summary
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 USER STATISTICS SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');

    console.log(`👥 Total Users: ${totalUsers || 0}`);
    console.log(`📄 Total Resumes Created: ${totalResumes || 0}`);
    console.log(`📁 Total Documents Uploaded: ${totalDocuments || 0}`);
    console.log(`💼 Total Jobs Added: ${totalJobs || 0}`);
    
    console.log(`\n📈 Breakdown:`);
    console.log(`   • Users with activity: ${usersWithActivity.length}`);
    console.log(`   • Users without activity: ${usersWithoutActivity}`);
    
    if (totalUsers && totalUsers > 0) {
        console.log(`\n📊 Averages per user:`);
        console.log(`   • Resumes: ${((totalResumes || 0) / totalUsers).toFixed(2)}`);
        console.log(`   • Documents: ${((totalDocuments || 0) / totalUsers).toFixed(2)}`);
        console.log(`   • Jobs: ${((totalJobs || 0) / totalUsers).toFixed(2)}`);
    }

    if (usersWithActivity.length > 0) {
        console.log(`\n📊 Averages per active user:`);
        console.log(`   • Resumes: ${((totalResumes || 0) / usersWithActivity.length).toFixed(2)}`);
        console.log(`   • Documents: ${((totalDocuments || 0) / usersWithActivity.length).toFixed(2)}`);
        console.log(`   • Jobs: ${((totalJobs || 0) / usersWithActivity.length).toFixed(2)}`);
    }

    // Display top 10 users by total activity
    console.log(`\n═══════════════════════════════════════════════════════════`);
    console.log('🏆 TOP 10 USERS BY TOTAL ACTIVITY');
    console.log('═══════════════════════════════════════════════════════════\n');

    const usersSorted = usersWithCounts.sort(
        (a: any, b: any) => b.totalActivity - a.totalActivity
    );

    const topUsers = usersSorted.slice(0, 10);
    topUsers.forEach((user: any, index: number) => {
        const email = user.email || 'No email';
        const name = user.name || 'No name';
        const resumes = user.resumeCount;
        const docs = user.documentCount;
        const jobs = user.jobCount;
        const total = user.totalActivity;
        const created = new Date(user.created_at).toLocaleDateString();
        console.log(`${(index + 1).toString().padStart(2, ' ')}. ${name.padEnd(25)} | ${email.padEnd(30)} | Resumes: ${resumes.toString().padStart(2)} | Docs: ${docs.toString().padStart(2)} | Jobs: ${jobs.toString().padStart(2)} | Total: ${total.toString().padStart(2)} | Joined: ${created}`);
    });

    // Display all users if requested
    const showAll = process.argv.includes('--all');
    if (showAll) {
        console.log(`\n═══════════════════════════════════════════════════════════`);
        console.log('📋 ALL USERS');
        console.log('═══════════════════════════════════════════════════════════\n');

        usersSorted.forEach((user: any, index: number) => {
            const email = user.email || 'No email';
            const name = user.name || 'No name';
            const resumes = user.resumeCount;
            const docs = user.documentCount;
            const jobs = user.jobCount;
            const total = user.totalActivity;
            const created = new Date(user.created_at).toLocaleDateString();
            console.log(`${(index + 1).toString().padStart(3, ' ')}. ${name.padEnd(25)} | ${email.padEnd(30)} | Resumes: ${resumes.toString().padStart(2)} | Docs: ${docs.toString().padStart(2)} | Jobs: ${jobs.toString().padStart(2)} | Total: ${total.toString().padStart(2)} | Joined: ${created}`);
        });
    } else {
        console.log(`\n💡 Tip: Add --all flag to see all users`);
    }

    console.log('\n');
}

showUserStats().catch(console.error);

