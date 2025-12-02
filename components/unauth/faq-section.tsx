'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

const faqs = [
    {
        question: "How does the AI matching work?",
        answer: "Our AI reads your uploaded resumes and understands your skills, experience, and achievements. When you paste a job description, it identifies what the employer is looking for and rewrites your resume to highlight the most relevant parts of your background."
    },
    {
        question: "Is my data secure?",
        answer: "Yes, absolutely. We use enterprise-grade encryption to protect your personal information and documents. We never share your data with third parties."
    },
    {
        question: "Can I edit the generated resume?",
        answer: "Of course! Our AI generates a strong draft, but you have full control to edit, refine, and polish every detail. You can also see your ATS score update in real-time as you make changes."
    },
    {
        question: "What is an ATS score?",
        answer: "ATS (Applicant Tracking System) is software that companies use to filter resumes. Your ATS score shows how well your resume matches the job description. A higher score means you're more likely to pass the initial screening."
    },
    {
        question: "Does it work for all industries?",
        answer: "Yes! T-AI-LOR works for any industry—Tech, Finance, Healthcare, Marketing, Engineering, and more. The AI adapts to each job description regardless of field."
    }
];

export function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section className="py-16 md:py-24 relative">
            <div className="container px-4 mx-auto max-w-3xl">
                <div className="text-center mb-10 md:mb-16">
                    <h2 className="text-2xl md:text-5xl font-bold font-display mb-4 md:mb-6">
                        Frequently Asked <span className="text-primary">Questions</span>
                    </h2>
                </div>

                <div className="space-y-3 md:space-y-4">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className="rounded-xl md:rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden transition-colors hover:border-white/10"
                        >
                            <button
                                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                className="flex items-center justify-between w-full p-4 md:p-6 text-left"
                            >
                                <span className="text-sm md:text-lg font-medium text-foreground pr-2">{faq.question}</span>
                                <span className="flex-shrink-0 text-muted-foreground">
                                    {openIndex === index ? <Minus className="w-4 h-4 md:w-5 md:h-5" /> : <Plus className="w-4 h-4 md:w-5 md:h-5" />}
                                </span>
                            </button>
                            <AnimatePresence>
                                {openIndex === index && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: "auto", opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.3 }}
                                    >
                                        <div className="px-4 md:px-6 pb-4 md:pb-6 text-sm md:text-base text-muted-foreground leading-relaxed">
                                            {faq.answer}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
