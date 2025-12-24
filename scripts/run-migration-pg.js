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
    
    // SSL configuration with proper certificate verification
    const isProduction = process.env.NODE_ENV === 'production';
    const sslCaPath = process.env.DATABASE_SSL_CA_PATH;
    const sslRejectUnauthorized = process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== undefined
        ? process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === 'true'
        : isProduction; // Default: true in production, false in dev
    
    const sslConfig = { rejectUnauthorized: sslRejectUnauthorized };
    
    // Load CA certificate if provided
    if (sslCaPath) {
        try {
            const caCert = fs.readFileSync(sslCaPath, 'utf8');
            sslConfig.ca = caCert;
            console.log(`📜 Loaded CA certificate from: ${sslCaPath}`);
        } catch (err) {
            console.error(`❌ Failed to load CA certificate from ${sslCaPath}:`, err.message);
            process.exit(1);
        }
    }
    
    // Log SSL configuration in development only
    if (process.env.NODE_ENV !== 'production') {
        console.log('🔐 SSL Config:', {
            rejectUnauthorized: sslRejectUnauthorized,
            hasCaCert: !!sslConfig.ca,
            environment: process.env.NODE_ENV || 'development'
        });
    }
    
    const client = new Client({
        connectionString: connectionString,
        ssl: sslConfig
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
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration().catch((err) => {
    console.error('❌ Unhandled error:', err);
    process.exit(1);
});
