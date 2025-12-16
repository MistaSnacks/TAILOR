import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Generate a unique referral code
function generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// GET /api/account/referral - Get referral code and stats
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Try to get existing referral code
        let { data: existingReferral, error: fetchError } = await supabase
            .from('referrals')
            .select('*')
            .eq('referrer_id', session.user.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        // If no pending referral exists, create one
        if (!existingReferral) {
            let code = generateReferralCode();
            let attempts = 0;

            // Ensure unique code
            while (attempts < 5) {
                const { data: existing } = await supabase
                    .from('referrals')
                    .select('id')
                    .eq('referral_code', code)
                    .single();

                if (!existing) break;
                code = generateReferralCode();
                attempts++;
            }

            const { data: newReferral, error: insertError } = await supabase
                .from('referrals')
                .insert({
                    referrer_id: session.user.id,
                    referral_code: code,
                    status: 'pending',
                })
                .select()
                .single();

            if (insertError) {
                console.error('Error creating referral:', insertError);
                return NextResponse.json({ error: 'Failed to create referral code' }, { status: 500 });
            }

            existingReferral = newReferral;
        }

        // Get referral stats
        const { data: completedReferrals, error: statsError } = await supabase
            .from('referrals')
            .select('*')
            .eq('referrer_id', session.user.id)
            .eq('status', 'completed');

        const successfulReferrals = completedReferrals?.length || 0;
        const bonusGenerationsEarned = successfulReferrals * 10; // 10 per referral

        // Get all referrals for history
        const { data: allReferrals } = await supabase
            .from('referrals')
            .select('id, status, completed_at, created_at')
            .eq('referrer_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        // Get referee emails for completed referrals
        const history = await Promise.all(
            (allReferrals || []).map(async (ref) => {
                let referee_email = undefined;
                if (ref.status === 'completed') {
                    // Try to get referee email if available
                    // This would require joining with users table
                }
                return {
                    ...ref,
                    referee_email,
                };
            })
        );

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tailor.app';
        const referralLink = `${baseUrl}/?ref=${existingReferral.referral_code}`;

        return NextResponse.json({
            referral_code: existingReferral.referral_code,
            referral_link: referralLink,
            stats: {
                total_referrals: allReferrals?.length || 0,
                successful_referrals: successfulReferrals,
                bonus_generations_earned: bonusGenerationsEarned,
            },
            history,
        });
    } catch (error) {
        console.error('Referral GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/account/referral - Process a referral signup
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { referral_code, referee_id } = body;

        if (!referral_code || !referee_id) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Find the referral
        const { data: referral, error: findError } = await supabase
            .from('referrals')
            .select('*')
            .eq('referral_code', referral_code)
            .eq('status', 'pending')
            .single();

        if (findError || !referral) {
            return NextResponse.json({ error: 'Invalid or expired referral code' }, { status: 400 });
        }

        // Prevent self-referral
        if (referral.referrer_id === referee_id) {
            return NextResponse.json({ error: 'Cannot use your own referral code' }, { status: 400 });
        }

        // Update referral to completed
        const { error: updateError } = await supabase
            .from('referrals')
            .update({
                referee_id,
                status: 'completed',
                completed_at: new Date().toISOString(),
                referrer_bonus_awarded: true,
                referee_bonus_awarded: true,
            })
            .eq('id', referral.id);

        if (updateError) {
            console.error('Error updating referral:', updateError);
            return NextResponse.json({ error: 'Failed to process referral' }, { status: 500 });
        }

        // Award bonus generations to referrer (10 generations)
        try {
            const { data: referrerData } = await supabase
                .from('users')
                .select('bonus_generations')
                .eq('id', referral.referrer_id)
                .single();

            await supabase
                .from('users')
                .update({ bonus_generations: (referrerData?.bonus_generations || 0) + 10 })
                .eq('id', referral.referrer_id);
        } catch (err) {
            console.error('Failed to award referrer bonus:', err);
        }

        // Award bonus generations to referee (5 generations)
        try {
            const { data: refereeData } = await supabase
                .from('users')
                .select('bonus_generations')
                .eq('id', referee_id)
                .single();

            await supabase
                .from('users')
                .update({ bonus_generations: (refereeData?.bonus_generations || 0) + 5 })
                .eq('id', referee_id);
        } catch (err) {
            console.error('Failed to award referee bonus:', err);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Referral POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
