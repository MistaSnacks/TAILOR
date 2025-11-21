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

    if (supabaseUrl && dbUrl) {
        const supabaseHost = new URL(supabaseUrl).hostname;
        const dbHost = new URL(dbUrl).hostname;

        console.log('Supabase Host:', supabaseHost);
        console.log('Database Host:', dbHost);

        if (dbHost.includes(supabaseHost) || supabaseHost.includes(dbHost)) {
            console.log('✅ Hosts appear to match.');
        } else {
            console.log('⚠️  Hosts do NOT match!');
        }
    }
} catch (err) {
    console.error('Error:', err.message);
}
