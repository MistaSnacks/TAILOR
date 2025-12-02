'use client';

import { motion } from 'framer-motion';
import { UploadCloud, Sparkles, FileText, GraduationCap, Zap, Target } from 'lucide-react';
import { TutorialSlides } from './tutorial-slides';

const steps = [
    {
        icon: UploadCloud,
        title: "Upload Documents",
        description: "Upload your existing resumes and career documents. Our AI extracts your skills and experience automatically."
    },
    {
        icon: Sparkles,
        title: "Generate Resume",
        description: "Paste any job description you want to apply for. Our AI creates a perfectly matched resume in seconds."
    },
    {
        icon: FileText,
        title: "Manage Resumes",
        description: "View, edit, and download your tailored resumes. See your ATS match score and optimize for each role."
    },
    {
        icon: GraduationCap,
        title: "Career Coach",
        description: "Chat with your AI career coach who knows your entire work history and helps you prepare for interviews."
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
                        Four simple steps to your dream job. No more hours spent tweaking bullet points.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-16 items-center">
                    {/* Left Column: Steps */}
                    <div className="space-y-8">
                        {steps.map((step, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.15 }}
                                className="flex gap-5"
                            >
                                <div className="flex-shrink-0">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative">
                                        <step.icon className="w-6 h-6 text-primary" />
                                        <span className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                                            {index + 1}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold mb-1.5 text-foreground">{step.title}</h3>
                                    <p className="text-muted-foreground leading-relaxed text-sm">
                                        {step.description}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Right Column: Floating Tutorial Slides with Badges */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 blur-[100px] rounded-full -z-10" />
                        
                        {/* Floating Tutorial Widget */}
                        <motion.div
                            animate={{ y: [-8, 8, -8] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                            className="relative w-full max-w-md mx-auto"
                        >
                            <TutorialSlides />
                            
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
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}
