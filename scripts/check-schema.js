const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    console.log('Checking profiles table schema...');

    // Try to select the new columns. If they don't exist, this will error.
    const { data, error } = await supabase
        .from('profiles')
        .select('phone_number, address, linkedin_url, portfolio_url')
        .limit(1);

    if (error) {
        console.error('❌ Error selecting new columns:', error.message);
        console.log('This confirms the migration has NOT been applied successfully.');
    } else {
        console.log('✅ Successfully selected new columns.');
        console.log('The migration appears to be applied.');
    }
}

checkSchema();
