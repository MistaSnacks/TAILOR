'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
    Gift,
    Copy,
    Check,
    Share2,
    Users,
    Sparkles,
    Twitter,
    Linkedin,
    Mail,
    Link as LinkIcon
} from 'lucide-react';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { TailorLoading } from '@/components/ui/tailor-loader';

type ReferralData = {
    referral_code: string;
    referral_link: string;
    stats: {
        total_referrals: number;
        successful_referrals: number;
        bonus_generations_earned: number;
    };
    history: {
        id: string;
        referee_email?: string;
        status: 'pending' | 'completed';
        completed_at?: string;
        created_at: string;
    }[];
};

export default function ReferralPage() {
    const prefersReducedMotion = useReducedMotion();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ReferralData | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        async function fetchReferralData() {
            try {
                const res = await fetch('/api/account/referral');
                if (res.ok) {
                    const result = await res.json();
                    setData(result);
                }
            } catch (error) {
                console.error('Failed to fetch referral data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchReferralData();
    }, []);

    const copyToClipboard = async () => {
        if (!data?.referral_link) return;

        try {
            await navigator.clipboard.writeText(data.referral_link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    };

    const shareVia = (platform: 'twitter' | 'linkedin' | 'email') => {
        if (!data?.referral_link) return;

        const message = `I've been using T-AI-LOR to tailor my resumes with AI, and it's amazing! Use my link to get 5 free bonus generations:`;
        const url = data.referral_link;

        const links = {
            twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}&url=${encodeURIComponent(url)}`,
            linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
            email: `mailto:?subject=${encodeURIComponent('Try T-AI-LOR - AI Resume Tailoring')}&body=${encodeURIComponent(`${message}\n\n${url}`)}`,
        };

        window.open(links[platform], '_blank', 'noopener,noreferrer');
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
                    Refer a Friend
                </h1>
                <p className="text-sm md:text-base text-muted-foreground">
                    Share TAILOR with friends and earn bonus generations.
                </p>
            </motion.div>

            <motion.div
                variants={container}
                {...(prefersReducedMotion ? {} : { initial: "hidden", animate: "show" })}
                className="space-y-6 md:space-y-8 max-w-3xl"
            >
                {/* How It Works */}
                <motion.section variants={item} className="glass-card p-6 rounded-xl border border-border/50">
                    <h2 className="text-lg font-bold font-display mb-4 flex items-center gap-2">
                        <Gift className="w-5 h-5 text-primary" />
                        How It Works
                    </h2>

                    <div className="grid md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-lg bg-muted/30 border border-border/50 text-center">
                            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                1
                            </div>
                            <h3 className="font-medium mb-1">Share Your Link</h3>
                            <p className="text-xs text-muted-foreground">Send your unique link to friends</p>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/30 border border-border/50 text-center">
                            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                2
                            </div>
                            <h3 className="font-medium mb-1">They Sign Up</h3>
                            <p className="text-xs text-muted-foreground">They get 5 bonus generations</p>
                        </div>
                        <div className="p-4 rounded-lg bg-muted/30 border border-border/50 text-center">
                            <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                3
                            </div>
                            <h3 className="font-medium mb-1">You Earn</h3>
                            <p className="text-xs text-muted-foreground">You get 10 bonus generations</p>
                        </div>
                    </div>
                </motion.section>

                {/* Your Referral Link */}
                <motion.section variants={item} className="glass-card p-6 rounded-xl border border-primary/30 bg-gradient-to-br from-primary/5 to-secondary/5">
                    <h2 className="text-lg font-bold font-display mb-4 flex items-center gap-2">
                        <LinkIcon className="w-5 h-5 text-primary" />
                        Your Referral Link
                    </h2>

                    <div className="flex gap-2 mb-4">
                        <div className="flex-1 px-4 py-3 rounded-lg bg-background/50 border border-border/50 font-mono text-sm truncate">
                            {data?.referral_link || 'Loading...'}
                        </div>
                        <button
                            onClick={copyToClipboard}
                            className={`px-4 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${copied
                                    ? 'bg-green-500 text-white'
                                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                }`}
                        >
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4" />
                                    Copied!
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4" />
                                    Copy
                                </>
                            )}
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => shareVia('twitter')}
                            className="flex-1 min-w-[120px] px-4 py-2.5 rounded-lg bg-[#1DA1F2]/10 text-[#1DA1F2] hover:bg-[#1DA1F2]/20 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                        >
                            <Twitter className="w-4 h-4" />
                            Twitter
                        </button>
                        <button
                            onClick={() => shareVia('linkedin')}
                            className="flex-1 min-w-[120px] px-4 py-2.5 rounded-lg bg-[#0A66C2]/10 text-[#0A66C2] hover:bg-[#0A66C2]/20 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                        >
                            <Linkedin className="w-4 h-4" />
                            LinkedIn
                        </button>
                        <button
                            onClick={() => shareVia('email')}
                            className="flex-1 min-w-[120px] px-4 py-2.5 rounded-lg bg-muted/50 text-foreground hover:bg-muted transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                        >
                            <Mail className="w-4 h-4" />
                            Email
                        </button>
                    </div>
                </motion.section>

                {/* Stats */}
                <motion.section variants={item} className="grid grid-cols-3 gap-4">
                    <div className="glass-card p-5 rounded-xl border border-border/50 text-center">
                        <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Share2 className="w-5 h-5 text-primary" />
                        </div>
                        <p className="text-2xl font-bold text-foreground">{data?.stats.total_referrals || 0}</p>
                        <p className="text-xs text-muted-foreground">Links Shared</p>
                    </div>
                    <div className="glass-card p-5 rounded-xl border border-border/50 text-center">
                        <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                        </div>
                        <p className="text-2xl font-bold text-foreground">{data?.stats.successful_referrals || 0}</p>
                        <p className="text-xs text-muted-foreground">Friends Joined</p>
                    </div>
                    <div className="glass-card p-5 rounded-xl border border-border/50 text-center">
                        <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <p className="text-2xl font-bold text-foreground">{data?.stats.bonus_generations_earned || 0}</p>
                        <p className="text-xs text-muted-foreground">Bonus Earned</p>
                    </div>
                </motion.section>

                {/* Referral History */}
                {data?.history && data.history.length > 0 && (
                    <motion.section variants={item} className="glass-card p-6 rounded-xl border border-border/50">
                        <h2 className="text-lg font-bold font-display mb-4">Referral History</h2>

                        <div className="space-y-3">
                            {data.history.map((referral) => (
                                <div
                                    key={referral.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                                >
                                    <div>
                                        <p className="text-sm font-medium">
                                            {referral.referee_email || 'Pending invitation'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(referral.created_at).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${referral.status === 'completed'
                                            ? 'bg-green-500/10 text-green-500'
                                            : 'bg-yellow-500/10 text-yellow-500'
                                        }`}>
                                        {referral.status === 'completed' ? 'Completed (+10)' : 'Pending'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.section>
                )}
            </motion.div>
        </div>
    );
}
