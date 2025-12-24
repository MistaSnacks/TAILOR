import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authOptions } from '@/lib/auth';

const isDev = process.env.NODE_ENV !== 'production';

/**
 * POST /api/account/invite
 * Process an invite code for the authenticated user
 * This is called from the client after successful authentication
 */
export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id || !session?.user?.email) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { invite_code } = body;

        if (!invite_code) {
            return NextResponse.json({ success: false, error: 'Missing invite_code' }, { status: 400 });
        }

        if (isDev) {
            console.log('🎟️ [INVITE API] Processing invite code:', invite_code);
            console.log('🎟️ [INVITE API] User ID:', session.user.id);
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Check if user is already legacy
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('is_legacy')
            .eq('id', session.user.id)
            .single();

        if (userError) {
            if (isDev) console.error('❌ [INVITE API] Error fetching user:', userError);
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        if (userData?.is_legacy) {
            if (isDev) console.log('ℹ️ [INVITE API] User is already legacy');
            return NextResponse.json({ success: true, already_legacy: true });
        }

        // Find the invite code
        const { data: invite, error: inviteError } = await supabase
            .from('invites')
            .select('*')
            .eq('code', invite_code)
            .eq('is_used', false)
            .single();

        if (inviteError || !invite) {
            if (isDev) console.log('❌ [INVITE API] Invalid or used invite code');
            return NextResponse.json({ success: false, error: 'Invalid or already used invite code' }, { status: 400 });
        }

        if (isDev) console.log('✅ [INVITE API] Valid invite found:', invite.id);

        // Update user to legacy
        const { error: updateUserError } = await supabase
            .from('users')
            .update({ is_legacy: true })
            .eq('id', session.user.id);

        if (updateUserError) {
            if (isDev) console.error('❌ [INVITE API] Error updating user:', updateUserError);
            return NextResponse.json({ success: false, error: 'Failed to apply legacy status' }, { status: 500 });
        }

        // Mark invite as used
        const { error: updateInviteError } = await supabase
            .from('invites')
            .update({
                is_used: true,
                used_by: session.user.id
            })
            .eq('id', invite.id);

        if (updateInviteError) {
            if (isDev) console.error('⚠️ [INVITE API] Error marking invite as used:', updateInviteError);
            // Continue anyway - user got legacy status
        }

        if (isDev) console.log('✅ [INVITE API] Legacy status applied successfully!');
        return NextResponse.json({ success: true, is_legacy: true });

    } catch (error) {
        console.error('❌ [INVITE API] Internal error:', error);
        return NextResponse.json({ success: false, error: 'Internal error' }, { status: 500 });
    }
}
