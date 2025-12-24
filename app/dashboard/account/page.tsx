'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    CreditCard,
    Bell,
    Lock,
    Gift,
    Crown,
    Check,
    ArrowRight,
    Loader2,
    AlertCircle,
    AlertTriangle,
    Trash2,
    X
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { TailorLoading } from '@/components/ui/tailor-loader';
import { DeleteAccountModal } from '@/components/account/delete-account-modal';
import { signOut } from 'next-auth/react';

type UserPreferences = {
    email_product_updates: boolean;
    email_job_digest: boolean;
    email_resume_tips: boolean;
    email_marketing: boolean;
};

type UserSubscription = {
    tier: 'free' | 'standard';
    status: 'active' | 'cancelled' | 'past_due' | 'expired';
    billing_period?: 'monthly' | 'quarterly';
    current_period_end?: string;
    cancel_at_period_end: boolean;
};

type ReferralStats = {
    total_referrals: number;
    successful_referrals: number;
    bonus_generations_earned: number;
};

export default function AccountSettingsPage() {
    const { user, updatePassword } = useAuth();
    const prefersReducedMotion = useReducedMotion();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [subscription, setSubscription] = useState<UserSubscription | null>(null);
    const [isLegacy, setIsLegacy] = useState(false);
    const [preferences, setPreferences] = useState<UserPreferences>({
        email_product_updates: true,
        email_job_digest: true,
        email_resume_tips: true,
        email_marketing: false,
    });
    const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);

    // Password change state
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [checkoutLoading, setCheckoutLoading] = useState(false);
    const [checkoutError, setCheckoutError] = useState<string | null>(null);
    const [billingError, setBillingError] = useState<string | null>(null);
    const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'quarterly'>('monthly');

    // Delete account state
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [scheduledDeletion, setScheduledDeletion] = useState<{ scheduled_for: string } | null>(null);
    const [cancellingDeletion, setCancellingDeletion] = useState(false);
    const [cancelDeletionError, setCancelDeletionError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchAccountData() {
            try {
                const [settingsRes, subscriptionRes, referralRes, deletionRes] = await Promise.all([
                    fetch('/api/account/settings'),
                    fetch('/api/account/subscription'),
                    fetch('/api/account/referral'),
                    fetch('/api/account/delete'),
                ]);

                if (settingsRes.ok) {
                    const data = await settingsRes.json();
                    setPreferences(data.preferences);
                }

                if (subscriptionRes.ok) {
                    const data = await subscriptionRes.json();
                    setSubscription(data.subscription);
                    setIsLegacy(data.is_legacy);
                }

                if (referralRes.ok) {
                    const data = await referralRes.json();
                    setReferralStats(data.stats);
                }

                if (deletionRes.ok) {
                    const data = await deletionRes.json();
                    if (data.scheduled && data.deletion) {
                        setScheduledDeletion(data.deletion);
                    }
                }
            } catch (error) {
                console.error('Failed to fetch account data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchAccountData();
    }, []);

    const handlePreferenceToggle = async (key: keyof UserPreferences) => {
        const newValue = !preferences[key];
        setPreferences(prev => ({ ...prev, [key]: newValue }));

        try {
            const response = await fetch('/api/account/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [key]: newValue }),
            });

            if (!response.ok) {
                // Revert optimistic state change on non-2xx response
                setPreferences(prev => ({ ...prev, [key]: !newValue }));
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('[Account Settings] Server error:', errorData);
            }
        } catch (error) {
            // Revert on network error
            setPreferences(prev => ({ ...prev, [key]: !newValue }));
            console.error('[Account Settings] Network error:', error);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setPasswordError('');
        setPasswordSuccess(false);

        if (newPassword.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }

        setChangingPassword(true);
        try {
            await updatePassword(newPassword);
            setPasswordSuccess(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowPasswordForm(false);
        } catch (error: any) {
            setPasswordError(error.message || 'Failed to update password');
        } finally {
            setChangingPassword(false);
        }
    };

    const handleUpgrade = async () => {
        setCheckoutLoading(true);
        setCheckoutError(null);
        try {
            const res = await fetch('/api/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ billingPeriod }),
            });

            if (res.ok) {
                const data = await res.json();
                if (data.url) {
                    window.location.href = data.url;
                } else {
                    setCheckoutError('Failed to get checkout URL. Please try again.');
                }
            } else {
                const errorData = await res.json().catch(() => ({ error: 'Failed to start checkout' }));
                setCheckoutError(errorData.error || 'Failed to start checkout. Please try again.');
            }
        } catch (error) {
            setCheckoutError('Network error. Please check your connection and try again.');
        } finally {
            setCheckoutLoading(false);
        }
    };

    const handleManageSubscription = async () => {
        setCheckoutLoading(true);
        setBillingError(null);
        try {
            const res = await fetch('/api/billing-portal', {
                method: 'POST',
            });

            if (res.ok) {
                const data = await res.json();
                if (data.url) {
                    window.location.href = data.url;
                } else {
                    setBillingError('Failed to get billing portal URL. Please try again.');
                }
            } else {
                const errorData = await res.json().catch(() => ({ error: 'Failed to open billing portal' }));
                setBillingError(errorData.error || 'Failed to open billing portal. Please try again.');
            }
        } catch (error) {
            setBillingError('Network error. Please check your connection and try again.');
        } finally {
            setCheckoutLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
                <TailorLoading mode="general" />
            </div>
        );
    }

    const container = {
        hidden: { opacity: prefersReducedMotion ? 1 : 0 },
        show: {
            opacity: 1,
            transition: prefersReducedMotion ? { duration: 0 } : { staggerChildren: 0.1 }
        }
    };

    const item = {
        hidden: { opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <div className="px-0 md:px-0">
            <motion.div
                {...(prefersReducedMotion ? {} : { initial: { opacity: 0, y: -20 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.5 } })}
                className="mb-6 md:mb-8"
            >
                <h1 className="font-display text-2xl md:text-4xl font-bold mb-1 md:mb-2 text-foreground">
                    Account Settings
                </h1>
                <p className="text-sm md:text-base text-muted-foreground">
                    Manage your subscription, preferences, and security.
                </p>
            </motion.div>

            <motion.div
                variants={container}
                {...(prefersReducedMotion ? {} : { initial: "hidden", animate: "show" })}
                className="space-y-6 md:space-y-8 max-w-3xl"
            >
                {/* Subscription Section */}
                <motion.section variants={item} className="glass-card p-6 rounded-xl border border-border/50">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold font-display">Subscription</h2>
                            <p className="text-sm text-muted-foreground">Manage your plan and billing</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="flex-1">
                            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${subscription?.tier === 'standard' || isLegacy
                                        ? 'bg-primary/20 text-primary'
                                        : 'bg-muted text-muted-foreground'
                                        }`}>
                                        {isLegacy ? (
                                            <span className="flex items-center gap-1">
                                                <Crown className="w-3 h-3" /> Legacy Access
                                            </span>
                                        ) : subscription?.tier === 'standard' ? (
                                            <span className="flex items-center gap-1">
                                                <Crown className="w-3 h-3" /> Standard
                                            </span>
                                        ) : 'Free'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">
                                            {isLegacy ? 'Legacy Lifetime Access' : subscription?.tier === 'standard' ? 'Standard Plan' : 'Free Plan'}
                                        </p>
                                        {isLegacy ? (
                                            <p className="text-xs text-muted-foreground">
                                                You have permanent access to all features.
                                            </p>
                                        ) : subscription?.tier === 'standard' && subscription?.current_period_end && (
                                            <p className="text-xs text-muted-foreground">
                                                {subscription.cancel_at_period_end ? 'Cancels' : 'Renews'} on{' '}
                                                {new Date(subscription.current_period_end).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {isLegacy ? (
                                    <div className="px-3 py-1 text-xs font-medium text-muted-foreground bg-muted/50 rounded">
                                        Lifetime
                                    </div>
                                ) : subscription?.tier === 'free' ? (
                                    null
                                ) : (
                                    <button
                                        onClick={handleManageSubscription}
                                        disabled={checkoutLoading}
                                        className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {checkoutLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        Manage
                                    </button>
                                )}
                            </div>

                            {billingError && (
                                <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-destructive text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    {billingError}
                                </div>
                            )}

                            {isLegacy || subscription?.tier === 'standard' ? null : (
                                <div className="space-y-4">
                                    <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 via-background to-secondary/5 border border-primary/20 relative overflow-hidden">
                                        {/* Background Decor */}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[40px] -z-10" />

                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                                            <div>
                                                <h3 className="font-bold text-lg">Upgrade to Standard</h3>
                                                <p className="text-sm text-muted-foreground">Unlock the full power of Tailor</p>
                                            </div>
                                            <div className="flex items-center gap-2 bg-background/50 p-1 rounded-lg border border-border/50 self-start md:self-auto">
                                                <button
                                                    onClick={() => setBillingPeriod('monthly')}
                                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${billingPeriod === 'monthly'
                                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                                        : 'hover:bg-muted text-muted-foreground'
                                                        }`}
                                                >
                                                    Monthly
                                                </button>
                                                <button
                                                    onClick={() => setBillingPeriod('quarterly')}
                                                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${billingPeriod === 'quarterly'
                                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                                        : 'hover:bg-muted text-muted-foreground'
                                                        }`}
                                                >
                                                    Quarterly <span className="text-[10px] opacity-90 ml-1">(-20%)</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-3 mb-6">
                                            {[
                                                'Unlimited Resume Generations',
                                                'AI Career Coach Access',
                                                'Job Builder & Matching',
                                                'Advanced Resume Analysis',
                                                'Upload up to 30 Documents',
                                                'Create Unlimited Resumes'
                                            ].map((feature, i) => (
                                                <div key={i} className="flex items-start gap-2">
                                                    <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                                                        <Check className="w-2.5 h-2.5 text-primary" />
                                                    </div>
                                                    <span className="text-sm text-muted-foreground">{feature}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {checkoutError && (
                                            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-destructive text-sm">
                                                <AlertCircle className="w-4 h-4" />
                                                {checkoutError}
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between pt-4 border-t border-border/50">
                                            <div className="flex items-baseline gap-1">
                                                <span className="text-2xl font-bold font-display">
                                                    ${billingPeriod === 'monthly' ? '15' : '12'}
                                                </span>
                                                <span className="text-sm text-muted-foreground">/mo</span>
                                                {billingPeriod === 'quarterly' && (
                                                    <span className="text-xs text-primary font-medium ml-2">
                                                        Billed ${12 * 3} quarterly
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={handleUpgrade}
                                                disabled={checkoutLoading}
                                                className="px-6 py-2.5 text-sm font-bold bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30 flex items-center gap-2"
                                            >
                                                {checkoutLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                                Upgrade Now
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </motion.section>

                {/* Refer a Friend Section */}
                <motion.section variants={item} className="glass-card p-6 rounded-xl border border-border/50">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Gift className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold font-display">Refer a Friend</h2>
                            <p className="text-sm text-muted-foreground">Earn bonus generations by sharing TAILOR</p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20 mb-4">
                        <div>
                            <p className="text-2xl font-bold text-foreground">
                                {referralStats?.bonus_generations_earned || 0}
                            </p>
                            <p className="text-sm text-muted-foreground">Bonus generations earned</p>
                        </div>
                        <div className="text-right">
                            <p className="text-lg font-semibold text-foreground">
                                {referralStats?.successful_referrals || 0}
                            </p>
                            <p className="text-sm text-muted-foreground">Successful referrals</p>
                        </div>
                    </div>

                    <Link
                        href="/dashboard/referral"
                        className="flex items-center justify-between w-full px-4 py-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors group"
                    >
                        <span className="text-sm font-medium">Get your referral link</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </Link>
                </motion.section>

                {/* Communications Section */}
                <motion.section variants={item} className="glass-card p-6 rounded-xl border border-border/50">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Bell className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold font-display">Communications</h2>
                            <p className="text-sm text-muted-foreground">Choose what emails you receive</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {[
                            { key: 'email_product_updates', label: 'Product updates & announcements', desc: 'New features and improvements' },
                            { key: 'email_job_digest', label: 'Weekly job match digest', desc: 'Jobs matching your profile' },
                            { key: 'email_resume_tips', label: 'Resume tips & improvements', desc: 'Suggestions to enhance your resume' },
                            { key: 'email_marketing', label: 'Marketing & promotions', desc: 'Special offers and news' },
                        ].map((pref) => (
                            <div key={pref.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
                                <div>
                                    <p className="text-sm font-medium">{pref.label}</p>
                                    <p className="text-xs text-muted-foreground">{pref.desc}</p>
                                </div>
                                <button
                                    onClick={() => handlePreferenceToggle(pref.key as keyof UserPreferences)}
                                    className={`relative w-11 h-6 rounded-full transition-colors ${preferences[pref.key as keyof UserPreferences]
                                        ? 'bg-primary'
                                        : 'bg-muted'
                                        }`}
                                >
                                    <div
                                        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${preferences[pref.key as keyof UserPreferences]
                                            ? 'translate-x-6'
                                            : 'translate-x-1'
                                            }`}
                                    />
                                </button>
                            </div>
                        ))}
                    </div>
                </motion.section>

                {/* Password Section */}
                <motion.section variants={item} className="glass-card p-6 rounded-xl border border-border/50">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Lock className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold font-display">Password</h2>
                            <p className="text-sm text-muted-foreground">Update your password</p>
                        </div>
                    </div>

                    {passwordSuccess && (
                        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2 text-green-500 text-sm">
                            <Check className="w-4 h-4" />
                            Password updated successfully
                        </div>
                    )}

                    {!showPasswordForm ? (
                        <button
                            onClick={() => setShowPasswordForm(true)}
                            className="px-4 py-2 text-sm font-medium bg-muted/50 hover:bg-muted rounded-lg transition-colors"
                        >
                            Change Password
                        </button>
                    ) : (
                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            {passwordError && (
                                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-destructive text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    {passwordError}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium mb-2">New Password</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                                    placeholder="Enter new password"
                                    required
                                    minLength={8}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">Confirm Password</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg bg-muted/50 border border-border focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-colors"
                                    placeholder="Confirm new password"
                                    required
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={changingPassword}
                                    className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                    {changingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Update Password
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPasswordForm(false);
                                        setPasswordError('');
                                        setNewPassword('');
                                        setConfirmPassword('');
                                    }}
                                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </motion.section>

                {/* Danger Zone Section */}
                <motion.section variants={item} className="glass-card p-6 rounded-xl border border-destructive/30 bg-destructive/5">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-destructive" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold font-display text-destructive">Danger Zone</h2>
                            <p className="text-sm text-muted-foreground">Irreversible account actions</p>
                        </div>
                    </div>

                    {/* Scheduled Deletion Banner */}
                    {scheduledDeletion && (
                        <div className="mb-4 space-y-3">
                            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="w-5 h-5 text-destructive" />
                                    <div>
                                        <p className="text-sm font-medium text-destructive">Account deletion scheduled</p>
                                        <p className="text-xs text-destructive/80">
                                            Your account will be deleted on{' '}
                                            {new Date(scheduledDeletion.scheduled_for).toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={async () => {
                                        setCancellingDeletion(true);
                                        setCancelDeletionError(null);
                                        try {
                                            const res = await fetch('/api/account/delete', { method: 'DELETE' });
                                            if (res.ok) {
                                                setScheduledDeletion(null);
                                            } else {
                                                const errorData = await res.json().catch(() => ({ error: 'Failed to cancel deletion' }));
                                                setCancelDeletionError(errorData.error || 'Failed to cancel deletion. Please try again.');
                                            }
                                        } catch (e) {
                                            console.error('Failed to cancel deletion:', e);
                                            setCancelDeletionError('Network error. Please check your connection and try again.');
                                        } finally {
                                            setCancellingDeletion(false);
                                        }
                                    }}
                                    disabled={cancellingDeletion}
                                    className="px-3 py-1.5 text-sm font-medium bg-background border border-border rounded-lg hover:bg-muted transition-colors flex items-center gap-2"
                                >
                                    {cancellingDeletion && <Loader2 className="w-3 h-3 animate-spin" />}
                                    Cancel Deletion
                                </button>
                            </div>
                            {cancelDeletionError && (
                                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-destructive text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    {cancelDeletionError}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-3">
                        {deleteError && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-destructive text-sm">
                                <AlertCircle className="w-4 h-4" />
                                {deleteError}
                            </div>
                        )}
                        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
                            <div>
                                <p className="text-sm font-medium">Delete Account</p>
                                <p className="text-xs text-muted-foreground">Permanently delete your account and all data</p>
                            </div>
                            <button
                                onClick={() => setShowDeleteModal(true)}
                                disabled={!!scheduledDeletion}
                                className="px-4 py-2 text-sm font-medium bg-destructive text-white rounded-lg hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <Trash2 className="w-4 h-4" />
                                Delete Account
                            </button>
                        </div>
                    </div>
                </motion.section>
            </motion.div>

            {/* Delete Account Modal */}
            <DeleteAccountModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                userEmail={user?.email || ''}
                onDeleted={async (mode) => {
                    if (mode === 'immediate') {
                        signOut({ callbackUrl: '/' });
                    } else {
                        // Refresh deletion status
                        try {
                            const res = await fetch('/api/account/delete');
                            if (res.ok) {
                                const data = await res.json();
                                if (data.scheduled) {
                                    setScheduledDeletion(data.deletion);
                                }
                            } else {
                                const errorData = await res.json().catch(() => ({ error: 'Failed to refresh deletion status' }));
                                setDeleteError(errorData.error || 'Failed to refresh deletion status. Please refresh the page.');
                            }
                        } catch (error) {
                            console.error('[Account Settings] Failed to refresh deletion status:', error);
                            setDeleteError('Network error. Please refresh the page to see the updated deletion status.');
                        }
                    }
                }}
            />
        </div>
    );
}
