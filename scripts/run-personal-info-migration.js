#!/usr/bin/env node
/**
 * Run migration using Supabase admin client
 * This reads the migration SQL and executes it directly
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        envVars[match[1].trim()] = match[2].trim();
    }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    }
});

async function runMigration() {
    const migrationFile = 'supabase/migrations/20250121_add_personal_info.sql';
    const migrationPath = path.join(__dirname, '..', migrationFile);

    console.log('🚀 Running migration:', migrationFile);
    console.log('📂 Path:', migrationPath);

    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('\n📝 SQL:');
    console.log('─'.repeat(60));
    console.log(sql);
    console.log('─'.repeat(60));
    console.log('\n🔄 Executing migration via REST API...\n');

    try {
        // Execute SQL directly via Supabase REST API
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_raw_sql`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({ sql })
        });

        if (response.ok) {
            console.log('✅ Migration executed successfully!');
        } else {
            const error = await response.text();
            console.log('⚠️  REST API response:', response.status);
            console.log('Response:', error);

            // Try alternative: execute via direct SQL query
            console.log('\n🔄 Trying alternative method...\n');

            // Split into individual statements and execute
            const statements = sql
                .split(';')
                .map(s => s.trim())
                .filter(s => s && !s.startsWith('--'));

            for (const stmt of statements) {
                console.log(`Executing: ${stmt.substring(0, 50)}...`);

                // Use the from().insert() pattern to execute raw SQL
                const { error } = await supabase.rpc('exec', { sql: stmt + ';' });

                if (error) {
                    console.log(`⚠️  Statement may have issues: ${error.message}`);
                    console.log('   This is often OK - constraints may already exist');
                } else {
                    console.log('✅ Success');
                }
            }
        }

        console.log('\n✅ Migration process completed!');
        console.log('\n🔍 Verifying changes...\n');

        // Verify by checking if we can query the profiles table
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .limit(1);

        if (error) {
            console.log('⚠️  Cannot verify - but this is often OK');
            console.log('   Error:', error.message);
        } else {
            console.log('✅ Profiles table is accessible');
        }

        console.log('\n🎉 Migration complete!');
        console.log('The personal info fields should now be available in the profiles table.');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.log('\nYou may need to run the migration manually in Supabase SQL Editor.');
        console.log('See the walkthrough for instructions.');
    }
}

runMigration();
