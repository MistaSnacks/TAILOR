'use client';

import { motion } from 'framer-motion';

export function BackgroundBeams() {
    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-slate-950 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />

            <motion.div
                animate={{
                    opacity: [0.3, 0.5, 0.3],
                    scale: [1, 1.1, 1],
                }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-[40%] -left-[20%] w-[70%] h-[70%] rounded-full bg-primary/10 blur-[120px]"
            />

            <motion.div
                animate={{
                    opacity: [0.2, 0.4, 0.2],
                    scale: [1, 1.2, 1],
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute top-[20%] -right-[20%] w-[60%] h-[60%] rounded-full bg-secondary/10 blur-[120px]"
            />

            <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
        </div>
    );
}
