import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: (process.env.STRIPE_API_VERSION || '2024-12-18.acacia') as any,
});

// Price IDs from Stripe Dashboard
export const STRIPE_PRICES = {
    STANDARD_MONTHLY: process.env.STRIPE_PRICE_STANDARD_MONTHLY || '',
    STANDARD_QUARTERLY: process.env.STRIPE_PRICE_STANDARD_QUARTERLY || '',
};

// Helper to get or create a Stripe customer for a user
export async function getOrCreateStripeCustomer(
    userId: string,
    email: string,
    existingCustomerId?: string | null
): Promise<string> {
    // Return existing customer if we have one
    if (existingCustomerId) {
        return existingCustomerId;
    }

    // Create new customer
    const customer = await stripe.customers.create({
        email,
        metadata: {
            userId,
        },
    });

    return customer.id;
}

// Create a checkout session for subscription
export async function createCheckoutSession({
    customerId,
    priceId,
    userId,
    successUrl,
    cancelUrl,
}: {
    customerId: string;
    priceId: string;
    userId: string;
    successUrl: string;
    cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
    const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
            {
                price: priceId,
                quantity: 1,
            },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
            userId,
        },
        subscription_data: {
            metadata: {
                userId,
            },
        },
    });

    return session;
}

// Create a billing portal session for subscription management
export async function createBillingPortalSession({
    customerId,
    returnUrl,
}: {
    customerId: string;
    returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
    const session = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
    });

    return session;
}

// Cancel all active subscriptions for a customer
export async function cancelCustomerSubscriptions(customerId: string): Promise<void> {
    // List all active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: 'active',
    });

    // Cancel each subscription immediately
    for (const subscription of subscriptions.data) {
        await stripe.subscriptions.cancel(subscription.id, {
            prorate: false, // Don't prorate - they're deleting their account
        });
    }
}

// Delete a Stripe customer (removes all data from Stripe)
export async function deleteStripeCustomer(customerId: string): Promise<void> {
    try {
        await stripe.customers.del(customerId);
    } catch (error: any) {
        // Customer may already be deleted or not exist
        if (error.code !== 'resource_missing') {
            throw error;
        }
    }
}
