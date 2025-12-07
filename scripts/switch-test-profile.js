/**
 * Browser Console Script: Switch to Test Profile
 * 
 * Copy and paste this into your browser console to switch between test profiles.
 * This creates a session for the selected test user so you can test resume generation.
 * 
 * TEST PROFILES:
 *   1. principal.engineer@test.tailor.dev - Senior tech (Principal Engineer)
 *   2. retail.worker@test.tailor.dev - Customer service/retail
 *   3. teacher.to.tech@test.tailor.dev - Teacher transitioning to tech
 *   4. warehouse.operator@test.tailor.dev - Warehouse/forklift operator
 *   5. government.employee@test.tailor.dev - Federal employee
 * 
 * Usage:
 *   1. First run the seed-test-profiles.sql in Supabase
 *   2. Then paste this script in browser console
 *   3. Call: await switchToTestProfile(1) // for Principal Engineer
 */

const TEST_PROFILES = {
  1: { email: 'principal.engineer@test.tailor.dev', name: 'Marcus Chen', type: 'Principal Engineer' },
  2: { email: 'retail.worker@test.tailor.dev', name: 'Jessica Martinez', type: 'Retail/Customer Service' },
  3: { email: 'teacher.to.tech@test.tailor.dev', name: 'David Thompson', type: 'Teacher → Tech' },
  4: { email: 'warehouse.operator@test.tailor.dev', name: 'Robert Jackson', type: 'Warehouse/Forklift' },
  5: { email: 'government.employee@test.tailor.dev', name: 'Patricia Williams', type: 'Government Employee' },
};

window.listTestProfiles = function() {
  console.log('%c📋 Available Test Profiles:', 'font-size: 14px; font-weight: bold; color: #3b82f6;');
  console.log('═'.repeat(60));
  Object.entries(TEST_PROFILES).forEach(([num, profile]) => {
    console.log(`  ${num}. ${profile.name} (${profile.type})`);
    console.log(`     Email: ${profile.email}`);
    console.log('');
  });
  console.log('═'.repeat(60));
  console.log('%c💡 Usage: await switchToTestProfile(1)', 'color: #22c55e;');
};

window.switchToTestProfile = async function(profileNumber) {
  const profile = TEST_PROFILES[profileNumber];
  
  if (!profile) {
    console.error('❌ Invalid profile number. Use listTestProfiles() to see options.');
    return;
  }

  console.log(`%c🔄 Switching to profile: ${profile.name}`, 'font-size: 14px; font-weight: bold; color: #3b82f6;');
  console.log(`   Type: ${profile.type}`);
  console.log(`   Email: ${profile.email}`);
  console.log('');

  try {
    // This approach depends on your auth setup
    // For NextAuth, you may need to create a session directly
    
    // Check if user exists first
    const checkResponse = await fetch('/api/profile', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (checkResponse.ok) {
      const currentUser = await checkResponse.json();
      console.log(`ℹ️  Currently logged in as: ${currentUser.email || 'unknown'}`);
    }

    console.log('');
    console.log('%c⚠️  To switch profiles, you need to:', 'color: #f59e0b; font-weight: bold;');
    console.log('');
    console.log('   Option 1 (Recommended for testing):');
    console.log('   Run this SQL in Supabase Dashboard:');
    console.log('');
    console.log(`   -- Create a session for test user`);
    console.log(`   INSERT INTO sessions (session_token, user_id, expires)`);
    console.log(`   SELECT 'test-session-token-${profileNumber}',`);
    console.log(`          u.id,`);
    console.log(`          NOW() + INTERVAL '30 days'`);
    console.log(`   FROM users u WHERE u.email = '${profile.email}';`);
    console.log('');
    console.log('   Then set cookie in console:');
    console.log(`   document.cookie = "next-auth.session-token=test-session-token-${profileNumber}; path=/; max-age=2592000";`);
    console.log('');
    console.log('   Option 2 (Production-like):');
    console.log('   Use Supabase Auth Magic Link or create OAuth test account');
    console.log('');
    console.log('%c📖 Profile Details:', 'color: #8b5cf6; font-weight: bold;');
    console.log(`   Name: ${profile.name}`);
    console.log(`   Type: ${profile.type}`);
    console.log(`   Email: ${profile.email}`);
    
    return profile;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
};

// Auto-show profiles list
console.log('%c🧪 TAILOR Test Profile Switcher Loaded', 'font-size: 16px; font-weight: bold; color: #3b82f6;');
console.log('');
listTestProfiles();


