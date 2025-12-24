import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { createBillingPortalSession } from '@/lib/stripe';

// Validate required environment variables
function getRequiredEnvVar(name: string): string {
    const value = process.env[name];
    if (!value || value.trim() === '') {
        throw new Error(`Missing required environment variable: ${name}. Please set it in your environment configuration.`);
    }
    return value;
}

const supabaseUrl = getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL');
const supabaseServiceRoleKey = getRequiredEnvVar('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// POST /api/billing-portal - Create Stripe billing portal session
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get user's Stripe customer ID
        const { data: subscription, error } = await supabase
            .from('user_subscriptions')
            .select('stripe_customer_id')
            .eq('user_id', session.user.id)
            .single();

        // Distinguish missing row from real DB errors
        if (error) {
            // PGRST116 is PostgREST's code for "no rows returned"
            if (error.code === 'PGRST116') {
                return NextResponse.json({
                    error: 'No active subscription found. Please upgrade first.'
                }, { status: 400 });
            }
            // Real database error - log and return 500
            console.error('Database error in billing-portal route:', {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint,
            });
            return NextResponse.json({
                error: 'Failed to retrieve subscription information'
            }, { status: 500 });
        }

        if (!subscription?.stripe_customer_id) {
            return NextResponse.json({
                error: 'No active subscription found. Please upgrade first.'
            }, { status: 400 });
        }

        // Create billing portal session
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const portalSession = await createBillingPortalSession({
            customerId: subscription.stripe_customer_id,
            returnUrl: `${baseUrl}/dashboard/account`,
        });

        return NextResponse.json({ url: portalSession.url });
    } catch (error) {
        console.error('Billing portal error:', error);
        return NextResponse.json({ error: 'Failed to create billing portal session' }, { status: 500 });
    }
}
