const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

async function runMigration() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        console.error('❌ DATABASE_URL not found in environment');
        process.exit(1);
    }

    console.log('🔌 Connecting to database...');
    const client = new Client({
        connectionString: connectionString,
        ssl: { rejectUnauthorized: false } // Required for Supabase connections
    });

    try {
        await client.connect();
        console.log('✅ Connected!');

        const migrationFile = 'supabase/migrations/20250121_add_personal_info.sql';
        const migrationPath = path.join(__dirname, '..', migrationFile);
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log(`\n📄 Executing migration: ${migrationFile}`);

        // Execute the SQL
        await client.query(sql);

        console.log('✅ Migration applied successfully!');

        // Verify columns
        const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'profiles' 
      AND column_name IN ('phone_number', 'address', 'linkedin_url', 'portfolio_url');
    `);

        console.log('\n🔍 Verified columns:', res.rows.map(r => r.column_name).join(', '));

    } catch (err) {
        console.error('❌ Migration failed:', err);
    } finally {
        await client.end();
    }
}

runMigration();
