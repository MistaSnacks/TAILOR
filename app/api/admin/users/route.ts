import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';
import { isAdminEmail } from '@/lib/config/admin';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/users - List/search users
export async function GET(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email || !isAdminEmail(session.user.email)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const search = searchParams.get('search') || '';
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '20');
        const offset = (page - 1) * limit;

        // Build query
        let query = supabase
            .from('users')
            .select('id, email, name, is_legacy, is_admin, created_at, bonus_generations, bonus_generations_expires_at', { count: 'exact' });

        // Apply search filter
        if (search) {
            // Escape special characters for PostgREST ilike filter
            // Replace backslashes first, then escape % and _
            const escapedSearch = search
                .replace(/\\/g, '\\\\')
                .replace(/%/g, '\\%')
                .replace(/_/g, '\\_');
            query = query.or(`email.ilike.%${escapedSearch}%,name.ilike.%${escapedSearch}%`);
        }

        // Get users with pagination
        const { data: users, error, count } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('Error fetching users:', error);
            return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
        }

        // Get subscription info for these users
        const userIds = users?.map(u => u.id) || [];
        const { data: subscriptions } = await supabase
            .from('user_subscriptions')
            .select('user_id, tier, status')
            .in('user_id', userIds);

        // Merge subscription data
        const usersWithSubscriptions = users?.map(user => ({
            ...user,
            subscription: subscriptions?.find(s => s.user_id === user.id) || { tier: 'free', status: 'active' }
        }));

        // Get stats
        const { count: totalUsers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true });

        const { count: legacyUsers } = await supabase
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('is_legacy', true);

        const { count: paidUsers } = await supabase
            .from('user_subscriptions')
            .select('*', { count: 'exact', head: true })
            .eq('tier', 'standard')
            .eq('status', 'active');

        return NextResponse.json({
            users: usersWithSubscriptions,
            pagination: {
                page,
                limit,
                total: count || 0,
                totalPages: Math.ceil((count || 0) / limit),
            },
            stats: {
                totalUsers: totalUsers || 0,
                legacyUsers: legacyUsers || 0,
                paidUsers: paidUsers || 0,
            },
        });
    } catch (error) {
        console.error('Admin users GET error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH /api/admin/users - Update user (toggle legacy, etc.)
export async function PATCH(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.email || !isAdminEmail(session.user.email)) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const body = await req.json();
        const { userId, updates } = body;

        if (!userId) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 });
        }

        // Only allow updating specific fields
        const allowedFields = ['is_legacy', 'is_admin', 'bonus_generations', 'bonus_generations_expires_at'];
        const sanitizedUpdates: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                sanitizedUpdates[key] = value;
            }
        }

        if (Object.keys(sanitizedUpdates).length === 0) {
            return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
        }

        const { error } = await supabase
            .from('users')
            .update(sanitizedUpdates)
            .eq('id', userId);

        if (error) {
            console.error('Error updating user:', error);
            return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Admin users PATCH error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
