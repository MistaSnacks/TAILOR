/**
 * Database Setup Script
 * 
 * This script sets up the entire database schema from scratch.
 * Run with: node scripts/setup-database.js
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
console.log(`URL: ${supabaseUrl}\n`);

async function setupDatabase() {
    console.log('📋 Database Setup Instructions\n');
    console.log('Your database is empty. You need to create the schema.');
    console.log('\n📝 Follow these steps:\n');

    console.log('1. Go to your Supabase Dashboard:');
    console.log(`   ${supabaseUrl.replace('/rest/v1', '').replace('https://', 'https://app.supabase.com/project/')}`);
    console.log('\n2. Navigate to: SQL Editor → New Query');
    console.log('\n3. Copy and paste the contents of these files IN ORDER:\n');

    const schemaPath = path.join(__dirname, '../supabase/schema.sql');
    const atomicRagPath = path.join(__dirname, '../supabase/migrations/20240522_atomic_rag.sql');
    const personalInfoPath = path.join(__dirname, '../supabase/migrations/20250120_add_personal_info.sql');

    console.log('   a) First, run: supabase/schema.sql');
    console.log('   b) Then, run: supabase/migrations/20240522_atomic_rag.sql');
    console.log('   c) Finally, run: supabase/migrations/20250120_add_personal_info.sql');

    console.log('\n📄 File locations:');
    console.log(`   Schema: ${schemaPath}`);
    console.log(`   Migration 1: ${atomicRagPath}`);
    console.log(`   Migration 2: ${personalInfoPath}`);

    console.log('\n💡 Alternative: If you have Supabase CLI installed, run:');
    console.log('   cd /Users/admin/TAILOR');
    console.log('   supabase db reset');
    console.log('   # or');
    console.log('   supabase db push');

    console.log('\n⚠️  Note: Make sure to run the files in the correct order!');
    console.log('   The schema.sql must be run BEFORE the migration files.\n');
}

setupDatabase();
