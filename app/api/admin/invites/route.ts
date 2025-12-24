
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authOptions } from '@/lib/auth';
import { isAdminEmail } from '@/lib/config/admin';
import crypto from 'crypto';

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.email || !isAdminEmail(session.user.email)) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // DETAILED LOGGING FOR DEBUGGING
        console.log('🔍 [INVITE DEBUG] Session user:', {
            id: session.user.id,
            email: session.user.email,
            idLength: session.user.id?.length,
            idType: typeof session.user.id,
        });

        // Verify the session user exists in public.users table
        const { data: existingUser, error: userError } = await supabase
            .from('users')
            .select('id, email')
            .eq('id', session.user.id)
            .single();

        console.log('🔍 [INVITE DEBUG] public.users check:', {
            found: !!existingUser,
            userEmail: existingUser?.email,
            error: userError?.message,
        });

        // Also check auth.users to diagnose FK constraint issue
        const { data: authUserData } = await supabase.auth.admin.getUserById(session.user.id);
        console.log('🔍 [INVITE DEBUG] auth.users check:', {
            found: !!authUserData?.user,
            authEmail: authUserData?.user?.email,
        });

        if (userError || !existingUser) {
            console.error('❌ User not found in public.users:', session.user.id, userError);
            return new NextResponse(
                JSON.stringify({
                    error: 'Session out of sync. Please sign out and sign back in to refresh your session.',
                    code: 'USER_NOT_SYNCED'
                }),
                { status: 401, headers: { 'Content-Type': 'application/json' } }
            );
        }

        // Generate a random code
        const code = crypto.randomBytes(6).toString('hex'); // 12 chars

        const { data, error } = await supabase
            .from('invites')
            .insert({
                code,
                created_by: session.user.id,
            })
            .select()
            .single();

        if (error) {
            console.error('Error creating invite:', error);
            return new NextResponse('Error creating invite', { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Internal Error:', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
