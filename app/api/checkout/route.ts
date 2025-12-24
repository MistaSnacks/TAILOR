import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { stripe, STRIPE_PRICES, getOrCreateStripeCustomer, createCheckoutSession } from '@/lib/stripe';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/checkout - Create Stripe checkout session
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || !session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { billingPeriod } = body; // 'monthly' or 'quarterly'

        // Validate billing period
        if (!billingPeriod || !['monthly', 'quarterly'].includes(billingPeriod)) {
            return NextResponse.json({ error: 'Invalid billing period' }, { status: 400 });
        }

        // Get price ID based on billing period
        const priceId = billingPeriod === 'monthly'
            ? STRIPE_PRICES.STANDARD_MONTHLY
            : STRIPE_PRICES.STANDARD_QUARTERLY;

        if (!priceId) {
            console.error('Missing Stripe price ID for:', billingPeriod);
            return NextResponse.json({ error: 'Payment configuration error' }, { status: 500 });
        }

        // Check if user already has a Stripe customer ID
        const { data: subscription } = await supabase
            .from('user_subscriptions')
            .select('stripe_customer_id')
            .eq('user_id', session.user.id)
            .maybeSingle();

        // Get or create Stripe customer
        const customerId = await getOrCreateStripeCustomer(
            session.user.id,
            session.user.email,
            subscription?.stripe_customer_id
        );

        // Save customer ID if new (only persist user_id and stripe_customer_id;
        // tier/status will be set by Stripe webhook after payment confirmation)
        if (!subscription?.stripe_customer_id) {
            await supabase
                .from('user_subscriptions')
                .upsert({
                    user_id: session.user.id,
                    stripe_customer_id: customerId,
                }, { onConflict: 'user_id' });
        }

        // Create checkout session
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const checkoutSession = await createCheckoutSession({
            customerId,
            priceId,
            userId: session.user.id,
            successUrl: `${baseUrl}/dashboard/account?payment=success`,
            cancelUrl: `${baseUrl}/dashboard/account?payment=cancelled`,
        });

        return NextResponse.json({ url: checkoutSession.url });
    } catch (error) {
        console.error('Checkout error:', error);
        return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
    }
}
