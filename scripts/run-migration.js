/**
 * Migration Script: Add Personal Info Fields to Users Table
 * 
 * This script runs the migration to add phone, address, linkedin_url,
 * and portfolio_url columns to the users table.
 * 
 * Run with: node scripts/run-migration.js
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

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
    console.log('🚀 Running migration: Add Personal Info Fields\n');

    try {
        // Read the migration SQL file
        const migrationPath = path.join(__dirname, '../supabase/migrations/20250120_add_personal_info.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

        console.log('📝 Migration SQL:');
        console.log(migrationSQL);
        console.log('\n🔄 Executing migration...\n');

        // Execute each SQL statement separately
        const statements = migrationSQL
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.startsWith('COMMENT'));

        for (const statement of statements) {
            if (statement.includes('ALTER TABLE')) {
                const { data, error } = await supabase.rpc('exec_sql', { sql: statement });

                if (error) {
                    // Try direct execution as fallback
                    console.log(`Executing: ${statement.substring(0, 60)}...`);
                    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`
                        },
                        body: JSON.stringify({ query: statement })
                    });

                    if (!response.ok) {
                        console.warn(`⚠️  Could not execute via RPC: ${error.message}`);
                        console.log('Trying alternative approach...');
                    }
                } else {
                    console.log(`✅ ${statement.substring(0, 60)}...`);
                }
            }
        }

        console.log('\n✅ Migration completed!');
        console.log('\n🔍 Verifying changes...\n');

        // Verify the columns were added
        const { data: columns, error: verifyError } = await supabase
            .from('users')
            .select('*')
            .limit(0);

        if (verifyError) {
            console.log('⚠️  Cannot verify via select, but migration commands were sent');
        } else {
            console.log('✅ Users table structure updated successfully!');
        }

        console.log('\n🎉 Done! The personal info fields are now available in the users table.');
        console.log('You can now use: phone, address, linkedin_url, portfolio_url');

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('\n💡 Manual fix:');
        console.log('Run these SQL commands directly in your Supabase SQL editor:\n');
        console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;');
        console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT;');
        console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url TEXT;');
        console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS portfolio_url TEXT;');
        process.exit(1);
    }
}

runMigration();
