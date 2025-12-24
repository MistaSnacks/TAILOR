import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { cancelCustomerSubscriptions, deleteStripeCustomer } from '@/lib/stripe';

const GRACE_PERIOD_DAYS = 30;

// GET /api/account/delete - Check if user has pending deletion
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: scheduledDeletion, error } = await supabaseAdmin
            .from('scheduled_deletions')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('status', 'pending')
            .maybeSingle();

        if (error) {
            console.error('Error checking scheduled deletion:', error);
            return NextResponse.json({ error: 'Failed to check deletion status' }, { status: 500 });
        }

        return NextResponse.json({
            scheduled: !!scheduledDeletion,
            deletion: scheduledDeletion ? {
                scheduled_for: scheduledDeletion.scheduled_for,
                created_at: scheduledDeletion.created_at,
            } : null,
        });
    } catch (error) {
        console.error('Delete GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/account/delete - Initiate account deletion
export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id || !session?.user?.email) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { mode, confirmation } = body;

        // Validate mode
        if (!mode || !['immediate', 'scheduled'].includes(mode)) {
            return NextResponse.json({ error: 'Invalid mode. Must be "immediate" or "scheduled"' }, { status: 400 });
        }

        // Validate confirmation (must match email or be "DELETE")
        const validConfirmation =
            confirmation === 'DELETE' ||
            confirmation?.toLowerCase() === session.user.email.toLowerCase();

        if (!validConfirmation) {
            return NextResponse.json({
                error: 'Invalid confirmation. Type your email address or "DELETE" to confirm.'
            }, { status: 400 });
        }

        // Check for active Stripe subscription and cancel it
        const { data: subscriptionData } = await supabaseAdmin
            .from('user_subscriptions')
            .select('stripe_customer_id, stripe_subscription_id')
            .eq('user_id', session.user.id)
            .maybeSingle();

        if (subscriptionData?.stripe_customer_id) {
            try {
                await cancelCustomerSubscriptions(subscriptionData.stripe_customer_id);
                console.log(`✅ Cancelled Stripe subscriptions for user ${session.user.id}`);
            } catch (stripeError) {
                console.error('Error cancelling Stripe subscription:', stripeError);
                // Continue with deletion even if Stripe fails
            }
        }

        if (mode === 'immediate') {
            // Delete Stripe customer data
            if (subscriptionData?.stripe_customer_id) {
                try {
                    await deleteStripeCustomer(subscriptionData.stripe_customer_id);
                } catch (stripeError) {
                    console.error('Error deleting Stripe customer:', stripeError);
                }
            }

            // Delete user immediately (CASCADE handles all related data)
            console.log(`🗑️ Attempting to delete user ${session.user.id} (${session.user.email})`);
            
            const { error: deleteError, count } = await supabaseAdmin
                .from('users')
                .delete()
                .eq('id', session.user.id)
                .select();

            if (deleteError) {
                console.error('❌ Error deleting user:', deleteError);
                return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
            }

            // Verify the user was actually deleted
            const { data: verifyUser } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('id', session.user.id)
                .maybeSingle();

            if (verifyUser) {
                console.error('❌ User still exists after delete attempt! RLS may be blocking the operation.');
                return NextResponse.json({ 
                    error: 'Account deletion failed. Please contact support.' 
                }, { status: 500 });
            }

            console.log(`✅ Successfully deleted user ${session.user.id} (${session.user.email})`);

            return NextResponse.json({
                success: true,
                mode: 'immediate',
                message: 'Account deleted successfully'
            });
        } else {
            // Schedule deletion for 30 days from now
            const scheduledFor = new Date();
            scheduledFor.setDate(scheduledFor.getDate() + GRACE_PERIOD_DAYS);

            // Check if there's already a scheduled deletion
            const { data: existingDeletion } = await supabaseAdmin
                .from('scheduled_deletions')
                .select('id')
                .eq('user_id', session.user.id)
                .eq('status', 'pending')
                .maybeSingle();

            if (existingDeletion) {
                return NextResponse.json({
                    error: 'Deletion already scheduled. Cancel the existing one first.'
                }, { status: 400 });
            }

            const { error: scheduleError } = await supabaseAdmin
                .from('scheduled_deletions')
                .insert({
                    user_id: session.user.id,
                    scheduled_for: scheduledFor.toISOString(),
                    status: 'pending',
                    reason: 'User requested account deletion',
                });

            if (scheduleError) {
                console.error('Error scheduling deletion:', scheduleError);
                return NextResponse.json({ error: 'Failed to schedule deletion' }, { status: 500 });
            }

            console.log(`📅 Scheduled deletion for user ${session.user.id} on ${scheduledFor.toISOString()}`);

            return NextResponse.json({
                success: true,
                mode: 'scheduled',
                scheduled_for: scheduledFor.toISOString(),
                message: `Account scheduled for deletion on ${scheduledFor.toLocaleDateString()}`
            });
        }
    } catch (error) {
        console.error('Delete POST error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/account/delete - Cancel scheduled deletion
export async function DELETE(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { error } = await supabaseAdmin
            .from('scheduled_deletions')
            .update({ status: 'cancelled' })
            .eq('user_id', session.user.id)
            .eq('status', 'pending');

        if (error) {
            console.error('Error cancelling deletion:', error);
            return NextResponse.json({ error: 'Failed to cancel deletion' }, { status: 500 });
        }

        console.log(`✅ Cancelled scheduled deletion for user ${session.user.id}`);

        return NextResponse.json({
            success: true,
            message: 'Scheduled deletion cancelled'
        });
    } catch (error) {
        console.error('Delete DELETE error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
