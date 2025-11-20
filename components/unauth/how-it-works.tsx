'use client';

import { motion } from 'framer-motion';
import { FileText, Sparkles, Target } from 'lucide-react';
import { FloatingMatchCard } from './floating-match-card';

const steps = [
    {
        icon: FileText,
        title: "Upload Resume",
        description: "Upload your existing resume and career documents. We parse and index your entire history."
    },
    {
        icon: Target,
        title: "Paste Job Description",
        description: "Copy the job description you want to apply for. Our AI analyzes the key requirements."
    },
    {
        icon: Sparkles,
        title: "Get Tailored Resume",
        description: "We generate a perfectly optimized resume that highlights the right skills for this specific role."
    }
];

export function HowItWorks() {
    return (
        <section id="how-it-works" className="py-32 relative overflow-hidden">
            <div className="container px-4 mx-auto">
                <div className="text-center mb-20">
                    <h2 className="text-3xl md:text-5xl font-bold font-display mb-6">
                        How it <span className="text-primary">Works</span>
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                        Three simple steps to your dream job. No more hours spent tweaking bullet points.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Left Column: Steps */}
                    <div className="space-y-12">
                        {steps.map((step, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.2 }}
                                className="flex gap-6"
                            >
                                <div className="flex-shrink-0 w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                    <step.icon className="w-7 h-7 text-primary" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-semibold mb-2 text-foreground">{step.title}</h3>
                                    <p className="text-muted-foreground leading-relaxed">
                                        {step.description}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Right Column: Visual */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 blur-[100px] rounded-full -z-10" />
                        <FloatingMatchCard />
                    </div>
                </div>
            </div>
        </section>
    );
}
