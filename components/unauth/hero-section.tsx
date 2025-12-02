'use client';

import { motion } from 'framer-motion';
import { ArrowRight, FileText, Sparkles, Upload } from 'lucide-react';
import Link from 'next/link';

export function HeroSection({ onOpenAuth }: { onOpenAuth: () => void }) {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] -z-10" />

            <div className="container px-4 mx-auto relative z-10">
                <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border backdrop-blur-sm mb-8"
                    >
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-sm text-foreground">AI-Powered Resume Tailoring</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        className="text-6xl md:text-8xl font-bold font-display tracking-tight mb-6 text-foreground"
                    >
                        Tailor your resume <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_auto]">
                            to every job
                        </span>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-xl text-muted-foreground mb-10 max-w-2xl"
                    >
                        Stop sending generic resumes. Our AI analyzes job descriptions and rewrites your resume to highlight the perfect skills—in seconds.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                        className="flex flex-col sm:flex-row gap-4"
                    >
                        <button
                            onClick={onOpenAuth}
                            className="group relative px-8 py-4 bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_auto] text-primary-foreground font-semibold rounded-xl overflow-hidden transition-all hover:shadow-[0_0_40px_-10px_rgba(52,211,153,0.5)]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                            <span className="relative flex items-center gap-2">
                                Get Started Free <ArrowRight className="w-4 h-4" />
                            </span>
                        </button>

                        <Link
                            href="#how-it-works"
                            className="px-8 py-4 bg-muted/50 border border-border text-foreground font-semibold rounded-xl hover:bg-muted transition-colors backdrop-blur-sm"
                        >
                            See How It Works
                        </Link>
                    </motion.div>
                </div>
            </div>

            {/* Floating Elements */}
            <motion.div
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/4 left-10 md:left-20 p-4 glass-card rounded-2xl hidden lg:block"
            >
                <FileText className="w-8 h-8 text-primary mb-2" />
                <div className="w-32 h-2 bg-muted rounded mb-2" />
                <div className="w-24 h-2 bg-muted rounded" />
            </motion.div>

            <motion.div
                animate={{ y: [10, -10, 10] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-1/4 right-10 md:right-20 p-4 glass-card rounded-2xl hidden lg:block"
            >
                <Upload className="w-8 h-8 text-secondary mb-2" />
                <div className="w-32 h-2 bg-muted rounded mb-2" />
                <div className="w-24 h-2 bg-muted rounded" />
            </motion.div>
        </section>
    );
}
