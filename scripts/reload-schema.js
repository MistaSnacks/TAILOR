const { Client } = require('pg');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

async function reloadSchema() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('Missing DATABASE_URL');
        process.exit(1);
    }

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
        connectionString,
        ssl: sslConfig
    });

    try {
        await client.connect();
        console.log('🔄 Notifying PostgREST to reload schema...');
        // This command tells PostgREST to rebuild its schema cache
        await client.query("NOTIFY pgrst, 'reload config'");
        console.log('✅ Notification sent successfully.');
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

reloadSchema();
