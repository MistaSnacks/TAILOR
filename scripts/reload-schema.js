const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function reloadSchema() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('Missing DATABASE_URL');
        process.exit(1);
    }

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
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
