import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/account/subscription - Fetch user subscription
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch subscription AND legacy status
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('is_legacy')
            .eq('id', session.user.id)
            .single();

        if (userError) {
            console.error('Error fetching user:', userError);
            return NextResponse.json(
                { error: 'Failed to fetch user data', details: userError.message },
                { status: 500 }
            );
        }

        if (!userData) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const { data: subscription, error } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

        if (error && error.code !== 'PGRST116') {
            console.error('Error fetching subscription:', error);
            return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 });
        }

        // Default to free tier if no subscription exists
        const defaultSubscription = {
            tier: 'free',
            status: 'active',
            billing_period: null,
            current_period_end: null,
            cancel_at_period_end: false,
        };

        return NextResponse.json({
            subscription: subscription || defaultSubscription,
            is_legacy: userData?.is_legacy || false,
        });
    } catch (error) {
        console.error('Subscription GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/account/subscription - Create or upgrade subscription
// Note: This is a placeholder. Payment integration (Stripe) will be added later.
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { tier, billing_period } = body;

        if (!tier || !['free', 'standard'].includes(tier)) {
            return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
        }

        if (!billing_period || !['monthly', 'quarterly', 'yearly'].includes(billing_period)) {
            return NextResponse.json({ error: 'Invalid billing_period' }, { status: 400 });
        }

        // For now, just update the tier without payment
        // TODO: Integrate with Stripe for actual payment processing
        const { error } = await supabase
            .from('user_subscriptions')
            .upsert(
                {
                    user_id: session.user.id,
                    tier,
                    billing_period: billing_period || 'monthly',
                    status: 'active',
                    current_period_start: new Date().toISOString(),
                    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
                    updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id' }
            );

        if (error) {
            console.error('Error updating subscription:', error);
            return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Subscription POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/account/subscription - Cancel subscription
export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Mark subscription to cancel at end of period
        const { error } = await supabase
            .from('user_subscriptions')
            .update({
                cancel_at_period_end: true,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', session.user.id);

        if (error) {
            console.error('Error cancelling subscription:', error);
            return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Subscription DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
