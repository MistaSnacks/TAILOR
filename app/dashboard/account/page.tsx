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
    AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { TailorLoading } from '@/components/ui/tailor-loader';

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

    useEffect(() => {
        async function fetchAccountData() {
            try {
                const [settingsRes, subscriptionRes, referralRes] = await Promise.all([
                    fetch('/api/account/settings'),
                    fetch('/api/account/subscription'),
                    fetch('/api/account/referral'),
                ]);

                if (settingsRes.ok) {
                    const data = await settingsRes.json();
                    setPreferences(data.preferences);
                }

                if (subscriptionRes.ok) {
                    const data = await subscriptionRes.json();
                    setSubscription(data.subscription);
                }

                if (referralRes.ok) {
                    const data = await referralRes.json();
                    setReferralStats(data.stats);
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
            await fetch('/api/account/settings', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [key]: newValue }),
            });
        } catch (error) {
            // Revert on error
            setPreferences(prev => ({ ...prev, [key]: !newValue }));
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

                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50 mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${subscription?.tier === 'standard'
                                    ? 'bg-primary/20 text-primary'
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                {subscription?.tier === 'standard' ? (
                                    <span className="flex items-center gap-1">
                                        <Crown className="w-3 h-3" /> Standard
                                    </span>
                                ) : 'Free'}
                            </div>
                            <div>
                                <p className="text-sm font-medium">
                                    {subscription?.tier === 'standard' ? 'Standard Plan' : 'Free Plan'}
                                </p>
                                {subscription?.tier === 'standard' && subscription?.current_period_end && (
                                    <p className="text-xs text-muted-foreground">
                                        {subscription.cancel_at_period_end ? 'Cancels' : 'Renews'} on{' '}
                                        {new Date(subscription.current_period_end).toLocaleDateString()}
                                    </p>
                                )}
                            </div>
                        </div>
                        <Link
                            href="/pricing"
                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            {subscription?.tier === 'free' ? 'Upgrade' : 'Manage'}
                        </Link>
                    </div>

                    {subscription?.tier === 'standard' && !subscription.cancel_at_period_end && (
                        <button
                            className="text-sm text-destructive hover:underline"
                            onClick={() => {/* TODO: Cancel subscription flow */ }}
                        >
                            Cancel subscription
                        </button>
                    )}
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
            </motion.div>
        </div>
    );
}
