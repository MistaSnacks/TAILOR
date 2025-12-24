const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing environment variables');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkApi() {
    console.log('🕵️ Checking API access to new columns...');

    // Try to select the new columns via the JS client (which uses the API)
    const { data, error } = await supabase
        .from('profiles')
        .select('phone_number, address, linkedin_url, portfolio_url')
        .limit(1);

    if (error) {
        console.error('❌ API Error:', error.message);
        console.log('The API still does not see the columns.');
    } else {
        console.log('✅ API Success! Columns are visible.');
        console.log('Data sample:', data);
    }
}

checkApi();
