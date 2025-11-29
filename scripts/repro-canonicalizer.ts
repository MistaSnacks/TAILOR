import { buildCanonicalExperiences } from '../lib/profile-canonicalizer';

async function runRepro() {
    console.log('🧪 Running canonicalizer reproduction...');

    // Case 1: "Self Financial" duplication
    // Simulating the user's report of duplicate roles
    const selfFinancialInputs = [
        {
            id: 'exp_1',
            user_id: 'user_1',
            company: 'Self Financial',
            title: 'Senior Software Engineer',
            start_date: '2022-01-01',
            end_date: '2023-01-01',
            is_current: false,
            experience_bullets: [],
        },
        {
            id: 'exp_2',
            user_id: 'user_1',
            company: 'Self Financial',
            title: 'Senior Software Engineer',
            start_date: '2022-01-01',
            end_date: '2023-01-01',
            is_current: false,
            experience_bullets: [],
        }
    ];

    console.log('\n--- Test Case 1: Exact Duplicates ---');
    const results1 = await buildCanonicalExperiences(selfFinancialInputs as any);
    console.log(`Input count: ${selfFinancialInputs.length}`);
    console.log(`Output count: ${results1.length}`);
    if (results1.length === 1) {
        console.log('✅ PASS: Merged exact duplicates');
    } else {
        console.log('❌ FAIL: Failed to merge exact duplicates');
    }

    // Case 2: "Self Financial" with slight variations
    const selfFinancialVariations = [
        {
            id: 'exp_3',
            user_id: 'user_1',
            company: 'Self Financial',
            title: 'Senior Software Engineer',
            start_date: '2022-01-01',
            end_date: '2023-01-01',
            is_current: false,
            experience_bullets: [],
        },
        {
            id: 'exp_4',
            user_id: 'user_1',
            company: 'Self Financial Inc.',
            title: 'Sr. Software Engineer',
            start_date: '2022-02-01', // Slightly different start
            end_date: '2023-01-01',
            is_current: false,
            experience_bullets: [],
        }
    ];

    console.log('\n--- Test Case 2: Variations (Inc. suffix, date shift) ---');
    const results2 = await buildCanonicalExperiences(selfFinancialVariations as any);
    console.log(`Input count: ${selfFinancialVariations.length}`);
    console.log(`Output count: ${results2.length}`);
    if (results2.length === 1) {
        console.log('✅ PASS: Merged variations');
    } else {
        console.log('❌ FAIL: Failed to merge variations');
        console.log('Normalized companies:', results2.map(r => r.normalizedCompany));
    }

    // Case 3: Disjoint dates (should NOT merge if gap is too large)
    const disjointInputs = [
        {
            id: 'exp_5',
            user_id: 'user_1',
            company: 'Google',
            title: 'Engineer',
            start_date: '2020-01-01',
            end_date: '2021-01-01',
            is_current: false,
            experience_bullets: [],
        },
        {
            id: 'exp_6',
            user_id: 'user_1',
            company: 'Google',
            title: 'Engineer',
            start_date: '2022-01-01', // 1 year gap
            end_date: '2023-01-01',
            is_current: false,
            experience_bullets: [],
        }
    ];

    console.log('\n--- Test Case 3: Disjoint Dates (1 year gap) ---');
    const results3 = await buildCanonicalExperiences(disjointInputs as any);
    console.log(`Input count: ${disjointInputs.length}`);
    console.log(`Output count: ${results3.length}`);
    if (results3.length === 2) {
        console.log('✅ PASS: Kept separate (correctly)');
    } else {
        console.log('❌ FAIL: Merged disjoint experiences (incorrectly)');
    }
    // Case 4: "Self Financial" vs "Self" (Potential failure point)
    const selfMismatch = [
        {
            id: 'exp_7',
            user_id: 'user_1',
            company: 'Self Financial',
            title: 'Senior Software Engineer',
            start_date: '2022-01-01',
            end_date: '2023-01-01',
            is_current: false,
            experience_bullets: [],
        },
        {
            id: 'exp_8',
            user_id: 'user_1',
            company: 'Self',
            title: 'Senior Software Engineer',
            start_date: '2022-01-01',
            end_date: '2023-01-01',
            is_current: false,
            experience_bullets: [],
        }
    ];

    console.log('\n--- Test Case 4: "Self Financial" vs "Self" ---');
    const results4 = await buildCanonicalExperiences(selfMismatch as any);
    console.log(`Input count: ${selfMismatch.length}`);
    console.log(`Output count: ${results4.length}`);
    if (results4.length === 1) {
        console.log('✅ PASS: Merged Self Financial vs Self');
    } else {
        console.log('❌ FAIL: Failed to merge Self Financial vs Self');
        console.log('Normalized companies:', results4.map(r => r.normalizedCompany));
    }
}

runRepro().catch(console.error);
