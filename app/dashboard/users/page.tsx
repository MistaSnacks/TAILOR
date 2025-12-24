'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Search,
  Users,
  Crown,
  CreditCard,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Gift,
  Ticket,
  Copy,
  LayoutDashboard,
  MessageSquare,
  BarChart3,
  FileText,
  UploadCloud,
  Briefcase,
  Calendar,
  Mail,
  User as UserIcon,
  TrendingUp,
  Award
} from 'lucide-react';
import { TailorLoading } from '@/components/ui/tailor-loader';
import { isAdminEmail } from '@/lib/config/admin';

type User = {
  id: string;
  email: string;
  name: string | null;
  is_legacy: boolean;
  is_admin: boolean;
  created_at: string;
  bonus_generations: number;
  bonus_generations_expires_at: string | null;
  subscription: {
    tier: 'free' | 'standard';
    status: string;
  };
};

type UserActivity = {
  id: string;
  email: string;
  name: string;
  created_at: string;
  activity: {
    resumes: number;
    documents: number;
    jobs: number;
    total: number;
  };
};

type Stats = {
  totalUsers: number;
  legacyUsers: number;
  paidUsers: number;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  // Existing Admin State
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats>({ totalUsers: 0, legacyUsers: 0, paidUsers: 0 });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [generatingInvite, setGeneratingInvite] = useState(false);
  const [activeTab, setActiveTab] = useState<'users' | 'tools' | 'analytics' | 'activity'>('users');

  // Activity State
  const [activityUsers, setActivityUsers] = useState<UserActivity[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);

  const generateInvite = async () => {
    setGeneratingInvite(true);
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        const link = `${window.location.origin}?invite=${data.code}`;
        setInviteLink(link);
      }
    } catch (error) {
      console.error('Failed to generate invite:', error);
    } finally {
      setGeneratingInvite(false);
    }
  };

  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      alert('Invite link copied to clipboard!');
    }
  };

  // Check admin access
  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      router.push('/dashboard');
      return;
    }
  }, [session, status, router]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) {
        params.set('search', search);
      }

      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        setStats(data.stats);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search]);

  const fetchActivity = useCallback(async () => {
    try {
      setLoadingActivity(true);
      const res = await fetch('/api/users/activity');
      if (res.ok) {
        const data = await res.json();
        setActivityUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching users activity:', error);
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  useEffect(() => {
    if (session?.user?.email && isAdminEmail(session.user.email)) {
      fetchUsers();
    }
  }, [session, fetchUsers]);

  // Fetch activity when tab is switched to activity or analytics
  useEffect(() => {
    if ((activeTab === 'activity' || activeTab === 'analytics') && activityUsers.length === 0) {
      fetchActivity();
    }
  }, [activeTab, activityUsers.length, fetchActivity]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const toggleLegacy = async (userId: string, currentValue: boolean) => {
    setUpdating(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          updates: { is_legacy: !currentValue },
        }),
      });

      if (res.ok) {
        setUsers(users.map(u =>
          u.id === userId ? { ...u, is_legacy: !currentValue } : u
        ));
        // Update stats
        setStats(prev => ({
          ...prev,
          legacyUsers: currentValue ? prev.legacyUsers - 1 : prev.legacyUsers + 1,
        }));
      }
    } catch (error) {
      console.error('Failed to update user:', error);
    } finally {
      setUpdating(null);
    }
  };

  const grantBonusGenerations = async (userId: string) => {
    const amount = prompt('Enter number of bonus generations to grant:');
    if (!amount || isNaN(parseInt(amount))) return;

    setUpdating(userId);
    try {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1); // 1 month from now

      const user = users.find(u => u.id === userId);
      const newBonus = (user?.bonus_generations || 0) + parseInt(amount);

      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          updates: {
            bonus_generations: newBonus,
            bonus_generations_expires_at: expiresAt.toISOString(),
          },
        }),
      });

      if (res.ok) {
        setUsers(users.map(u =>
          u.id === userId ? {
            ...u,
            bonus_generations: newBonus,
            bonus_generations_expires_at: expiresAt.toISOString(),
          } : u
        ));
      }
    } catch (error) {
      console.error('Failed to grant bonus:', error);
    } finally {
      setUpdating(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const totalActivityStats = activityUsers.reduce((acc, user) => ({
    resumes: acc.resumes + user.activity.resumes,
    documents: acc.documents + user.activity.documents,
    jobs: acc.jobs + user.activity.jobs,
    total: acc.total + user.activity.total,
  }), { resumes: 0, documents: 0, jobs: 0, total: 0 });

  const activeUsersCount = activityUsers.filter(u => u.activity.total > 0).length;

  // Calculate Top Users
  const topActiveUsers = [...activityUsers]
    .sort((a, b) => b.activity.total - a.activity.total)
    .slice(0, 5);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <TailorLoading mode="general" />
      </div>
    );
  }

  if (!session?.user?.email || !isAdminEmail(session.user.email)) {
    return null;
  }

  return (
    <div className="px-0 md:px-0">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 md:mb-8"
      >
        <div className="flex items-center gap-3 mb-1 md:mb-2">
          <Shield className="w-8 h-8 text-primary" />
          <h1 className="font-display text-2xl md:text-4xl font-bold text-foreground">
            Admin Panel
          </h1>
        </div>
        <p className="text-sm md:text-base text-muted-foreground">
          Manage users, grant legacy access, and view platform statistics.
        </p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border/50 overflow-x-auto">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'users'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
          <Users className="w-4 h-4" />
          Users
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'activity'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          Activity
        </button>
        <button
          onClick={() => setActiveTab('tools')}
          className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'tools'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
          <MessageSquare className="w-4 h-4" />
          Invites & Tools
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-2 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === 'analytics'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
          <BarChart3 className="w-4 h-4" />
          Analytics
        </button>
      </div>

      {/* Analytics Tab */}
      {
        activeTab === 'analytics' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6"
          >
            <div className="glass-card p-5 rounded-xl border border-border/50 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
              <p className="text-xs text-muted-foreground">Total Users</p>
            </div>
            <div className="glass-card p-5 rounded-xl border border-border/50 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.legacyUsers}</p>
              <p className="text-xs text-muted-foreground">Legacy Users</p>
            </div>
            <div className="glass-card p-5 rounded-xl border border-border/50 text-center">
              <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.paidUsers}</p>
              <p className="text-xs text-muted-foreground">Paid Subscribers</p>
            </div>

            {/* Existing Charts (Distribution & Subscriptions) */}
            <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Legacy vs Standard Distribution */}
              <div className="glass-card p-6 rounded-xl border border-border/50">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  User Distribution
                </h3>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Legacy Users</span>
                      <span className="font-medium">{stats.legacyUsers} ({Math.round(stats.totalUsers ? (stats.legacyUsers / stats.totalUsers) * 100 : 0)}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${stats.totalUsers ? (stats.legacyUsers / stats.totalUsers) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-muted-foreground">Standard Users</span>
                      <span className="font-medium">{stats.totalUsers - stats.legacyUsers} ({Math.round(stats.totalUsers ? ((stats.totalUsers - stats.legacyUsers) / stats.totalUsers) * 100 : 0)}%)</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${stats.totalUsers ? ((stats.totalUsers - stats.legacyUsers) / stats.totalUsers) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Subscription Status */}
              <div className="glass-card p-6 rounded-xl border border-border/50">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-green-500" />
                  Subscription Status
                </h3>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Paid Subscribers</span>
                      <span className="font-medium text-green-500">{stats.paidUsers}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${stats.totalUsers ? (stats.paidUsers / stats.totalUsers) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Free Tier</span>
                      <span className="font-medium">{stats.totalUsers - stats.paidUsers}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-muted-foreground/30 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${stats.totalUsers ? ((stats.totalUsers - stats.paidUsers) / stats.totalUsers) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* NEW: Activity Charts Row (Moved from Activity Tab) */}
            <div className="col-span-1 md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              {/* Activity Breakdown Chart */}
              <div className="glass-card p-6 rounded-xl border border-border/50">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  Platform Usage Breakdown
                </h3>
                {activityUsers.length === 0 ? (
                  <div className="py-8 flex justify-center text-muted-foreground">
                    <span className="text-sm">Loading activity data from database...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Resumes Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-primary" />
                          <span className="font-medium">Resumes Generated</span>
                        </div>
                        <span className="font-bold">{totalActivityStats.resumes}</span>
                      </div>
                      <div className="h-4 bg-muted/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${Math.max(5, (totalActivityStats.resumes / totalActivityStats.total) * 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 text-right">
                        {Math.round((totalActivityStats.resumes / totalActivityStats.total) * 100) || 0}% of all activity
                      </div>
                    </div>

                    {/* Documents Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <div className="flex items-center gap-2">
                          <UploadCloud className="w-4 h-4 text-blue-500" />
                          <span className="font-medium">Documents Uploaded</span>
                        </div>
                        <span className="font-bold">{totalActivityStats.documents}</span>
                      </div>
                      <div className="h-4 bg-muted/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${Math.max(5, (totalActivityStats.documents / totalActivityStats.total) * 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 text-right">
                        {Math.round((totalActivityStats.documents / totalActivityStats.total) * 100) || 0}% of all activity
                      </div>
                    </div>

                    {/* Jobs Bar */}
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-amber-500" />
                          <span className="font-medium">Jobs Saved</span>
                        </div>
                        <span className="font-bold">{totalActivityStats.jobs}</span>
                      </div>
                      <div className="h-4 bg-muted/50 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${Math.max(5, (totalActivityStats.jobs / totalActivityStats.total) * 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 text-right">
                        {Math.round((totalActivityStats.jobs / totalActivityStats.total) * 100) || 0}% of all activity
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Top Users Chart */}
              <div className="glass-card p-6 rounded-xl border border-border/50">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500" />
                  Top Active Users
                </h3>
                {activityUsers.length === 0 ? (
                  <div className="py-8 flex justify-center text-muted-foreground">
                    <span className="text-sm">Loading activity data...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {topActiveUsers.map((user, index) => (
                      <div key={user.id} className="relative">
                        <div className="flex items-center justify-between z-10 relative text-sm mb-1.5 px-2">
                          <div className="flex items-center gap-3">
                            <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${index === 0 ? 'bg-yellow-500 text-white' :
                                index === 1 ? 'bg-gray-400 text-white' :
                                  index === 2 ? 'bg-orange-400 text-white' : 'bg-muted text-muted-foreground'
                              }`}>
                              {index + 1}
                            </span>
                            <span className="font-medium truncate max-w-[120px]">{user.name || user.email.split('@')[0]}</span>
                          </div>
                          <span className="font-bold text-foreground">{user.activity.total} <span className="text-xs font-normal text-muted-foreground">actions</span></span>
                        </div>
                        <div className="h-8 bg-muted/30 rounded-lg overflow-hidden absolute top-0 left-0 w-full -z-0">
                          <div
                            className="h-full bg-primary/10 rounded-lg transition-all duration-1000 ease-out"
                            style={{ width: `${(user.activity.total / (topActiveUsers[0]?.activity.total || 1)) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                    {topActiveUsers.length === 0 && (
                      <div className="text-center py-10 text-muted-foreground text-sm">No activity data yet</div>
                    )}
                  </div>
                )}
              </div>
            </div>

          </motion.div>
        )
      }

      {/* Tools Tab */}
      {
        activeTab === 'tools' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            {/* Invite Generation */}
            <div className="glass-card p-6 rounded-xl border border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-pink-500/10 flex items-center justify-center">
                    <Ticket className="w-6 h-6 text-pink-500" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Legacy User Invite</h2>
                    <p className="text-sm text-muted-foreground">Generate a unique invite link that automatically grants legacy status.</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <AnimatePresence>
                    {inviteLink && (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex items-center gap-2 bg-muted/50 rounded-lg pl-3 pr-2 py-1.5 border border-border/50"
                      >
                        <code className="text-xs font-mono text-muted-foreground select-all">
                          {inviteLink}
                        </code>
                        <button
                          onClick={copyInviteLink}
                          className="p-1.5 hover:bg-background rounded-md text-muted-foreground hover:text-foreground transition-colors"
                          title="Copy link"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button
                    onClick={generateInvite}
                    disabled={generatingInvite}
                    className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors font-medium disabled:opacity-50"
                  >
                    {generatingInvite ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Ticket className="w-4 h-4" />
                    )}
                    Generate Invite
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )
      }

      {/* Activity Tab - Now just user grid */}
      {
        activeTab === 'activity' && (
          loadingActivity ? (
            <div className="py-20 flex justify-center">
              <TailorLoading mode="general" />
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="grid grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 mb-6 md:mb-8"
              >
                <div className="glass-card p-4 md:p-6 rounded-xl border border-border/50">
                  <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span className="text-xs md:text-sm font-medium">Activity</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-foreground">{activityUsers.length}</div>
                  <div className="text-xs text-muted-foreground mt-1">{activeUsersCount} active</div>
                </div>

                <div className="glass-card p-4 md:p-6 rounded-xl border border-border/50">
                  <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span className="text-xs md:text-sm font-medium">Resumes</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-foreground">{totalActivityStats.resumes}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {activityUsers.length > 0 ? (totalActivityStats.resumes / activityUsers.length).toFixed(1) : 0} avg
                  </div>
                </div>

                <div className="glass-card p-4 md:p-6 rounded-xl border border-border/50">
                  <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                    <UploadCloud className="w-4 h-4" />
                    <span className="text-xs md:text-sm font-medium">Documents</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-foreground">{totalActivityStats.documents}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {activityUsers.length > 0 ? (totalActivityStats.documents / activityUsers.length).toFixed(1) : 0} avg
                  </div>
                </div>

                <div className="glass-card p-4 md:p-6 rounded-xl border border-border/50">
                  <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                    <Briefcase className="w-4 h-4" />
                    <span className="text-xs md:text-sm font-medium">Jobs</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-foreground">{totalActivityStats.jobs}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {activityUsers.length > 0 ? (totalActivityStats.jobs / activityUsers.length).toFixed(1) : 0} avg
                  </div>
                </div>

                <div className="glass-card p-4 md:p-6 rounded-xl border border-border/50">
                  <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs md:text-sm font-medium">Total Actions</span>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-foreground">{totalActivityStats.total}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {activityUsers.length > 0 ? (totalActivityStats.total / activityUsers.length).toFixed(1) : 0} avg
                  </div>
                </div>
              </motion.div>

              {/* Activity Grid */}
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
              >
                {activityUsers.map((user) => (
                  <motion.div
                    key={user.id}
                    variants={item}
                    className="glass-card p-4 md:p-6 rounded-xl border border-border/50 hover:border-primary/30 transition-all group"
                  >
                    {/* User Header */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                        <UserIcon className="w-5 h-5 md:w-6 md:h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-sm md:text-base text-foreground truncate mb-1">
                          {user.name}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* Activity Stats */}
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <FileText className="w-3.5 h-3.5" />
                          <span>Resumes</span>
                        </div>
                        <span className="font-semibold text-sm text-foreground">{user.activity.resumes}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <UploadCloud className="w-3.5 h-3.5" />
                          <span>Documents</span>
                        </div>
                        <span className="font-semibold text-sm text-foreground">{user.activity.documents}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Briefcase className="w-3.5 h-3.5" />
                          <span>Jobs</span>
                        </div>
                        <span className="font-semibold text-sm text-foreground">{user.activity.jobs}</span>
                      </div>
                    </div>

                    {/* Total Activity & Date */}
                    <div className="pt-4 border-t border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-muted-foreground">Total Activity</span>
                        <span className="text-lg font-bold text-primary">{user.activity.total}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>Joined {formatDate(user.created_at)}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </>
          )
        )
      }

      {/* Users Tab */}
      {
        activeTab === 'users' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Search */}
            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              onSubmit={handleSearch}
              className="mb-6"
            >
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by email or name..."
                    className="w-full pl-10 pr-4 py-3 rounded-lg bg-muted/30 border border-border/50 focus:border-primary/50 focus:outline-none transition-colors"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
                >
                  Search
                </button>
              </div>
            </motion.form>

            {/* Users Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="glass-card rounded-xl border border-border/50 overflow-hidden"
            >
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30 border-b border-border/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">User</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Bonus</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Joined</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-foreground">{user.name || 'No name'}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1">
                            {user.is_legacy && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-500">
                                <Crown className="w-3 h-3" />
                                Legacy
                              </span>
                            )}
                            {user.is_admin && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-500">
                                <Shield className="w-3 h-3" />
                                Admin
                              </span>
                            )}
                            {user.subscription.tier === 'standard' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                                <CreditCard className="w-3 h-3" />
                                Paid
                              </span>
                            )}
                            {!user.is_legacy && user.subscription.tier === 'free' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                                Free
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <span className="font-medium">{user.bonus_generations || 0}</span>
                            {user.bonus_generations_expires_at && (
                              <span className="text-xs text-muted-foreground">
                                (expires {new Date(user.bonus_generations_expires_at).toLocaleDateString()})
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => grantBonusGenerations(user.id)}
                              disabled={updating === user.id}
                              className="p-2 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-primary"
                              title="Grant bonus generations"
                            >
                              <Gift className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => toggleLegacy(user.id, user.is_legacy)}
                              disabled={updating === user.id}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${user.is_legacy
                                ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
                                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                                }`}
                            >
                              {updating === user.id ? (
                                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : user.is_legacy ? (
                                <>
                                  <X className="w-3 h-3" />
                                  Remove Legacy
                                </>
                              ) : (
                                <>
                                  <Check className="w-3 h-3" />
                                  Grant Legacy
                                </>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-border/50 bg-muted/20">
                  <p className="text-sm text-muted-foreground">
                    Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={pagination.page === 1}
                      className="p-2 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-medium">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={pagination.page === pagination.totalPages}
                      className="p-2 rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )
      }
    </div >
  );
}
