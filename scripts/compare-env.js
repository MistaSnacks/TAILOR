const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const envPath = path.join(__dirname, '../.env.local');
try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const envVars = {};
    envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) envVars[match[1].trim()] = match[2].trim();
    });

    const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
    const dbUrl = envVars.DATABASE_URL;

    console.log('Supabase URL:', supabaseUrl);
    console.log('Database URL:', dbUrl ? 'Found (hidden)' : 'Missing');

    // Validate URLs before parsing
    let supabaseHost = null;
    let dbHost = null;

    if (!supabaseUrl) {
        console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL');
        process.exit(1);
    }

    if (!dbUrl) {
        console.error('❌ Missing DATABASE_URL');
        process.exit(1);
    }

    try {
        supabaseHost = new URL(supabaseUrl).hostname;
    } catch (err) {
        console.error('❌ Invalid NEXT_PUBLIC_SUPABASE_URL:', err.message);
        process.exit(1);
    }

    try {
        dbHost = new URL(dbUrl).hostname;
    } catch (err) {
        console.error('❌ Invalid DATABASE_URL:', err.message);
        process.exit(1);
    }

    // Both URLs parsed successfully, proceed with comparison
    console.log('Supabase Host:', supabaseHost);
    console.log('Database Host:', dbHost);

    if (dbHost === supabaseHost) {
        console.log('✅ Hosts appear to match.');
    } else {
        console.log('⚠️  Hosts do NOT match!');
    }
} catch (err) {
    console.error('Error:', err.message);
}
