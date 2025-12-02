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
        <section id="how-it-works" className="py-16 md:py-32 relative overflow-hidden">
            <div className="container px-4 mx-auto">
                <div className="text-center mb-12 md:mb-20">
                    <h2 className="text-2xl md:text-5xl font-bold font-display mb-4 md:mb-6">
                        How it <span className="text-primary">Works</span>
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg">
                        Four simple steps to your dream job. No more hours spent tweaking bullet points.
                    </p>
                </div>

                <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                    {/* Left Column: Steps */}
                    <div className="space-y-6 md:space-y-8 order-2 lg:order-1">
                        {steps.map((step, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.5, delay: index * 0.15 }}
                                className="flex gap-4 md:gap-5"
                            >
                                <div className="flex-shrink-0">
                                    <div className="w-10 md:w-12 h-10 md:h-12 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center relative">
                                        <step.icon className="w-5 md:w-6 h-5 md:h-6 text-primary" />
                                        <span className="absolute -top-1.5 md:-top-2 -left-1.5 md:-left-2 w-5 md:w-6 h-5 md:h-6 rounded-full bg-primary text-primary-foreground text-[10px] md:text-xs font-bold flex items-center justify-center">
                                            {index + 1}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-base md:text-lg font-semibold mb-1 md:mb-1.5 text-foreground">{step.title}</h3>
                                    <p className="text-muted-foreground leading-relaxed text-sm">
                                        {step.description}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Right Column: Tutorial Slides */}
                    <div className="relative order-1 lg:order-2">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 blur-[60px] md:blur-[100px] rounded-full -z-10" />
                        
                        <motion.div
                            animate={{ y: [-8, 8, -8] }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                            className="relative w-full max-w-sm md:max-w-md mx-auto"
                        >
                            <TutorialSlides />
                            
                            {/* Floating Badge 1 (Lightning) - hidden on small mobile */}
                            <motion.div
                                animate={{ y: [-10, 10, -10] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute -top-4 -right-4 md:-top-6 md:-right-6 w-12 md:w-16 h-12 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-secondary to-primary flex items-center justify-center shadow-xl shadow-secondary/30 border border-white/20 z-10 hidden sm:flex"
                            >
                                <Zap className="w-6 md:w-8 h-6 md:h-8 text-primary-foreground fill-primary-foreground" />
                            </motion.div>

                            {/* Floating Badge 2 (Target) - hidden on small mobile */}
                            <motion.div
                                animate={{ y: [10, -10, 10] }}
                                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                                className="absolute -bottom-4 -left-4 md:-bottom-6 md:-left-6 w-10 md:w-14 h-10 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-xl shadow-primary/30 border border-white/20 z-10 hidden sm:flex"
                            >
                                <Target className="w-5 md:w-7 h-5 md:h-7 text-primary-foreground" />
                            </motion.div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
}
