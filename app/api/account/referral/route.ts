import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

type ReferralRecord = {
    id: string;
    status: string;
    completed_at: string | null;
    created_at: string;
    referee_id: string | null;
};

type UserRecord = {
    id: string;
    email: string | null;
};

// GET /api/account/referral - Get referral code and stats
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Use database function to get or create referral code (handles uniqueness atomically)
        const { data: referralCode, error: codeError } = await supabaseAdmin
            .rpc('get_or_create_referral_code', { p_user_id: session.user.id });

        if (codeError || !referralCode) {
            console.error('Error getting referral code:', codeError);
            return NextResponse.json({ error: 'Failed to get referral code' }, { status: 500 });
        }

        // Get referral stats
        const { data: completedReferrals, error: statsError } = await supabaseAdmin
            .from('referrals')
            .select('*')
            .eq('referrer_id', session.user.id)
            .eq('status', 'completed');

        const successfulReferrals = completedReferrals?.length || 0;
        const bonusGenerationsEarned = successfulReferrals * 10; // 10 per referral

        // Get all referrals for history
        const { data: allReferrals } = await supabaseAdmin
            .from('referrals')
            .select('id, status, completed_at, created_at, referee_id')
            .eq('referrer_id', session.user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        // Collect all referee_ids from completed referrals
        const refereeIds = (allReferrals || [])
            .filter((ref: ReferralRecord) => ref.status === 'completed' && ref.referee_id)
            .map((ref: ReferralRecord) => ref.referee_id)
            .filter((id: string | null): id is string => id !== null);

        // Fetch emails for all referees in a single query (avoid N+1)
        let emailMap: Record<string, string> = {};
        if (refereeIds.length > 0) {
            const { data: users, error: usersError } = await supabaseAdmin
                .from('users')
                .select('id, email')
                .in('id', refereeIds);

            if (!usersError && users) {
                emailMap = users.reduce((acc: Record<string, string>, user: UserRecord) => {
                    if (user.email) {
                        acc[user.id] = user.email;
                    }
                    return acc;
                }, {} as Record<string, string>);
            }
        }

        // Get referee emails for completed referrals
        const history = (allReferrals || []).map((ref: ReferralRecord) => {
            const referee_email = ref.status === 'completed' && ref.referee_id
                ? emailMap[ref.referee_id] || undefined
                : undefined;
            return {
                id: ref.id,
                status: ref.status,
                completed_at: ref.completed_at,
                created_at: ref.created_at,
                referee_email,
            };
        });

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tailor.app';
        // Fix: Use the user's referral code directly, not from a specific "pending" referral record
        const referralLink = `${baseUrl}/?ref=${referralCode}`;

        return NextResponse.json({
            referral_code: referralCode,
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

        if (!supabaseAdmin) {
            return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
        }

        // Use atomic database function to process referral in a single transaction
        // This prevents TOCTOU race conditions by checking status, awarding bonuses,
        // and updating status atomically
        const { data: result, error: rpcError } = await supabaseAdmin.rpc('process_referral_atomic', {
            p_referral_code: referral_code,
            p_referee_id: referee_id,
        });

        if (rpcError) {
            console.error('Error processing referral:', rpcError);
            return NextResponse.json({ error: 'Failed to process referral' }, { status: 500 });
        }

        // Check result from database function
        if (!result || !result.success) {
            const errorMessage = result?.error || 'Failed to process referral';
            
            // Handle "already processed" as idempotent success
            if (errorMessage.includes('already processed')) {
                return NextResponse.json({ success: true }, { status: 200 });
            }
            
            // Other error cases
            const statusCode = errorMessage.includes('Invalid') || errorMessage.includes('expired')
                ? 400
                : 500;

            return NextResponse.json({
                success: false,
                error: errorMessage
            }, { status: statusCode });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Referral POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
