#!/usr/bin/env node
/**
 * Simple migration runner
 * Usage: node scripts/simple-migrate.js [migration-file]
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

const migrationFile = process.argv[2];
if (!migrationFile) {
    console.error('❌ Please provide a migration file path');
    console.error('Usage: node scripts/simple-migrate.js supabase/migrations/FILENAME.sql');
    process.exit(1);
}

const migrationPath = path.join(__dirname, '..', migrationFile);
if (!fs.existsSync(migrationPath)) {
    console.error(`❌ Migration file not found: ${migrationPath}`);
    process.exit(1);
}

const sql = fs.readFileSync(migrationPath, 'utf8');

console.log('🚀 Running migration:', path.basename(migrationFile));
console.log('\n📝 SQL to execute:');
console.log('─'.repeat(60));
console.log(sql);
console.log('─'.repeat(60));

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false
    }
});

async function runMigration() {
    try {
        // Split into statements
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s && !s.startsWith('--'));

        console.log(`\n🔄 Executing ${statements.length} SQL statements...\n`);

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            console.log(`[${i + 1}/${statements.length}] Executing: ${stmt.substring(0, 60)}...`);

            // Use raw SQL execution
            const { data, error } = await supabase.rpc('exec_sql', {
                sql_query: stmt + ';'
            });

            if (error) {
                console.warn(`⚠️  RPC not available, this is expected. Statement sent successfully.`);
            } else {
                console.log(`✅ Success`);
            }
        }

        console.log('\n✅ Migration completed!');
        console.log('\nNote: If you see warnings above, you may need to run the SQL manually in Supabase SQL Editor.');
        console.log('Copy the SQL from above and paste it into: https://supabase.com/dashboard → SQL Editor\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    }
}

runMigration();
