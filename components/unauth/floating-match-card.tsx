'use client';

import { motion } from 'framer-motion';
import { FileText, Zap, Target } from 'lucide-react';

export function FloatingMatchCard() {
    return (
        <div className="relative w-full max-w-md mx-auto aspect-[4/3]">
            {/* Main Card */}
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                animate={{ y: [-10, 10, -10] }}
                transition={{
                    y: { duration: 6, repeat: Infinity, ease: "easeInOut" },
                    opacity: { duration: 0.5 },
                    scale: { duration: 0.5 }
                }}
                className="absolute inset-0 bg-card/80 backdrop-blur-xl rounded-3xl border border-border shadow-2xl overflow-hidden"
            >
                <div className="p-6 h-full flex flex-col justify-between">
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg shadow-primary/20">
                            <FileText className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <div className="space-y-2 flex-1">
                            <div className="h-3 w-24 bg-muted rounded-full" />
                            <div className="h-2 w-16 bg-muted/50 rounded-full" />
                        </div>
                    </div>

                    {/* Content Lines */}
                    <div className="space-y-3 mb-8">
                        <div className="h-2 w-full bg-muted/50 rounded-full" />
                        <div className="h-2 w-[90%] bg-muted/50 rounded-full" />
                        <div className="h-2 w-[75%] bg-muted/50 rounded-full" />
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-auto">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-muted-foreground">Match Score</span>
                            <span className="text-sm font-bold text-primary">95% Match</span>
                        </div>
                        <div className="h-2 w-full bg-muted/50 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                whileInView={{ width: "95%" }}
                                transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
                                className="h-full bg-gradient-to-r from-primary to-secondary rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                            />
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Floating Badge 1 (Lightning) */}
            <motion.div
                animate={{ y: [-10, 10, -10] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-6 -right-6 w-16 h-16 rounded-2xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center shadow-xl shadow-secondary/30 border border-white/20 z-10"
            >
                <Zap className="w-8 h-8 text-primary-foreground fill-primary-foreground" />
            </motion.div>

            {/* Floating Badge 2 (Target) */}
            <motion.div
                animate={{ y: [10, -10, 10] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-6 -left-6 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-xl shadow-primary/30 border border-white/20 z-10"
            >
                <Target className="w-7 h-7 text-primary-foreground" />
            </motion.div>
        </div>
    );
}
