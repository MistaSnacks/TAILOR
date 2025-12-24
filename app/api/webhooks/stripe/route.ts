import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

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
const webhookSecret = getRequiredEnvVar('STRIPE_WEBHOOK_SECRET');

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

// POST /api/webhooks/stripe - Handle Stripe webhook events
export async function POST(req: NextRequest) {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get('stripe-signature');

    if (!signature) {
        console.error('Missing stripe-signature header');
        return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('Stripe webhook received:', event.type);

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object as Stripe.Checkout.Session;
                await handleCheckoutCompleted(session);
                break;
            }

            case 'customer.subscription.created':
            case 'customer.subscription.updated': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionUpdated(subscription);
                break;
            }

            case 'customer.subscription.deleted': {
                const subscription = event.data.object as Stripe.Subscription;
                await handleSubscriptionDeleted(subscription);
                break;
            }

            case 'invoice.paid': {
                const invoice = event.data.object as Stripe.Invoice;
                await handleInvoicePaid(invoice);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object as Stripe.Invoice;
                await handleInvoicePaymentFailed(invoice);
                break;
            }

            default:
                console.log('Unhandled event type:', event.type);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('Webhook handler error:', error);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    if (!userId) {
        console.error('No userId in checkout session metadata', {
            sessionId: session.id,
            customerId,
            subscriptionId,
        });
        throw new Error(`Missing userId in checkout session metadata for session ${session.id}`);
    }

    console.log('Checkout completed for user:', userId);

    // Update user subscription
    const { error: upsertError } = await supabase
        .from('user_subscriptions')
        .upsert({
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            tier: 'standard',
            status: 'active',
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

    if (upsertError) {
        console.error('Failed to upsert subscription in checkout completed:', {
            userId,
            customerId,
            subscriptionId,
            error: upsertError,
        });
        throw new Error(`Failed to upsert subscription: ${upsertError.message}`);
    }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    let userId = subscription.metadata?.userId;

    if (!userId) {
        // Try to find user by subscription ID
        const { data: existingSubscription, error: lookupError } = await supabase
            .from('user_subscriptions')
            .select('user_id')
            .eq('stripe_subscription_id', subscription.id)
            .single();

        if (lookupError || !existingSubscription?.user_id) {
            console.error('Cannot find user for subscription:', subscription.id, lookupError);
            throw new Error(`Cannot find user for subscription: ${subscription.id}`);
        }

        userId = existingSubscription.user_id;
    }

    const status = mapStripeStatus(subscription.status);
    // Access period dates from the subscription item (not deprecated subscription-level fields)
    const subscriptionItem = subscription.items.data[0];
    const currentPeriodEnd = subscriptionItem?.current_period_end 
        ? new Date(subscriptionItem.current_period_end * 1000).toISOString() 
        : null;
    const currentPeriodStart = subscriptionItem?.current_period_start 
        ? new Date(subscriptionItem.current_period_start * 1000).toISOString() 
        : null;
    const cancelAtPeriodEnd = subscription.cancel_at_period_end;

    // Determine billing period from price
    let billingPeriod = 'monthly';
    const priceId = subscription.items.data[0]?.price?.id;
    if (priceId === process.env.STRIPE_PRICE_STANDARD_QUARTERLY) {
        billingPeriod = 'quarterly';
    }

    const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
            tier: status === 'active' ? 'standard' : 'free',
            status,
            billing_period: billingPeriod,
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            cancel_at_period_end: cancelAtPeriodEnd,
            updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);

    if (updateError) {
        console.error('Failed to update subscription:', {
            subscriptionId: subscription.id,
            userId,
            status,
            error: updateError,
        });
        throw new Error(`Failed to update subscription: ${updateError.message}`);
    }

    console.log('Subscription updated:', subscription.id, 'Status:', status);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    // Subscription ended - downgrade to free
    const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
            tier: 'free',
            status: 'cancelled',
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);

    if (updateError) {
        console.error('Failed to delete subscription:', {
            subscriptionId: subscription.id,
            error: updateError,
        });
        throw new Error(`Failed to delete subscription: ${updateError.message}`);
    }

    console.log('Subscription deleted:', subscription.id);
}

/**
 * Type-safe helper to extract subscription ID from invoice.
 * Handles all possible types: null, string, or Stripe.Subscription object.
 * @returns The subscription ID as a string, or null if not available
 */
function extractSubscriptionId(invoice: Stripe.Invoice): string | null {
    // Access subscription property safely - it can be string | Stripe.Subscription | null
    const subscription = (invoice as any).subscription as string | Stripe.Subscription | null | undefined;

    if (!subscription) {
        return null;
    }

    // If it's already a string, use it directly
    if (typeof subscription === 'string') {
        return subscription;
    }

    // If it's a Stripe.Subscription object, extract its id
    if (typeof subscription === 'object' && subscription !== null && 'id' in subscription) {
        return subscription.id;
    }

    // Fallback: return null if we can't determine the type
    return null;
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
    const subscriptionId = extractSubscriptionId(invoice);

    if (!subscriptionId) {
        console.warn('Invoice paid but no subscription ID available:', {
            invoiceId: invoice.id,
        });
        return;
    }

    const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
            status: 'active',
            updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscriptionId);

    if (updateError) {
        console.error('Failed to update subscription on invoice paid:', {
            subscriptionId,
            error: updateError,
        });
        throw new Error(`Failed to update subscription on invoice paid: ${updateError.message}`);
    }

    console.log('Invoice paid for subscription:', subscriptionId);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const subscriptionId = extractSubscriptionId(invoice);

    if (!subscriptionId) {
        console.warn('Invoice payment failed but no subscription ID available:', {
            invoiceId: invoice.id,
        });
        return;
    }

    const { error: updateError } = await supabase
        .from('user_subscriptions')
        .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', subscriptionId);

    if (updateError) {
        console.error('Failed to update subscription on invoice payment failed:', {
            subscriptionId,
            error: updateError,
        });
        throw new Error(`Failed to update subscription on payment failed: ${updateError.message}`);
    }

    console.log('Invoice payment failed for subscription:', subscriptionId);
}

function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): string {
    const statusMap: Record<Stripe.Subscription.Status, string> = {
        active: 'active',
        canceled: 'cancelled',
        incomplete: 'active', // Still allow access during grace period
        incomplete_expired: 'expired',
        past_due: 'past_due',
        paused: 'active', // Treat paused as active for now
        trialing: 'active',
        unpaid: 'past_due',
    };
    
    if (stripeStatus in statusMap) {
        return statusMap[stripeStatus];
    }
    
    // Unknown status - log warning and default to safer 'past_due' status
    console.warn('Unexpected Stripe subscription status:', {
        status: stripeStatus,
        message: 'Unmapped subscription status encountered',
    });
    return 'past_due';
}
