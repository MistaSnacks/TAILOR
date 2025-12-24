/**
 * Database Setup Script
 * 
 * This script sets up the entire database schema from scratch.
 * Run with: node scripts/setup-database.js
 */

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
    
    // Robustly construct dashboard URL from Supabase URL
    let dashboardUrl;
    try {
        const url = new URL(supabaseUrl);
        // Extract project reference from hostname (e.g., "xyzabc.supabase.co" -> "xyzabc")
        const hostname = url.hostname;
        const projectRefMatch = hostname.match(/^([^.]+)\.supabase\.(co|io|dev)$/);
        
        if (projectRefMatch && projectRefMatch[1]) {
            dashboardUrl = `https://app.supabase.com/project/${projectRefMatch[1]}`;
        } else {
            // Fallback: try to extract from path or use original URL
            console.warn('⚠️  Could not parse Supabase project reference from URL');
            dashboardUrl = supabaseUrl.replace('/rest/v1', '');
        }
    } catch (err) {
        // Fallback if URL parsing fails - try to extract project ref with regex
        console.warn('⚠️  Invalid Supabase URL format, attempting regex extraction');
        const projectRefMatch = supabaseUrl.match(/^https?:\/\/([^.]+)\.supabase\.(co|io|dev)/);
        if (projectRefMatch && projectRefMatch[1]) {
            dashboardUrl = `https://app.supabase.com/project/${projectRefMatch[1]}`;
        } else {
            // Last resort: use sanitized original URL
            dashboardUrl = supabaseUrl.replace('/rest/v1', '');
        }
    }
    
    console.log(`   ${dashboardUrl}`);
    console.log('\n2. Navigate to: SQL Editor → New Query');
    console.log('\n3. Copy and paste the contents of these files IN ORDER:\n');

    const schemaPath = path.join(__dirname, '../supabase/schema.sql');
    const atomicRagPath = path.join(__dirname, '../supabase/migrations/20240522_atomic_rag.sql');
    const personalInfoPath = path.join(__dirname, '../supabase/migrations/20250121_add_personal_info.sql');

    console.log('   a) First, run: supabase/schema.sql');
    console.log('   b) Then, run: supabase/migrations/20240522_atomic_rag.sql');
    console.log('   c) Finally, run: supabase/migrations/20250121_add_personal_info.sql');

    console.log('\n📄 File locations:');
    console.log(`   Schema: ${schemaPath}`);
    console.log(`   Migration 1: ${atomicRagPath}`);
    console.log(`   Migration 2: ${personalInfoPath}`);

    console.log('\n💡 Alternative: If you have Supabase CLI installed, run:');
    console.log('   supabase db reset');
    console.log('   # or');
    console.log('   supabase db push');

    console.log('\n⚠️  Note: Make sure to run the files in the correct order!');
    console.log('   The schema.sql must be run BEFORE the migration files.\n');
}

setupDatabase();
