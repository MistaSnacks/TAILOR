'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

const faqs = [
    {
        question: "Will the AI make things up or exaggerate my experience?",
        answer: "No. TAILOR uses RAG (Retrieval-Augmented Generation) to ground every bullet point in YOUR actual experience. It only rewrites and reorganizes content from the documents you've uploaded—it never fabricates skills, roles, or achievements. Everything on your generated resume will be truthful and verifiable."
    },
    {
        question: "How is my data protected?",
        answer: "Your data is scoped to your account with strict access controls. We use enterprise-grade encryption both in transit and at rest. We only send the minimum necessary context to the AI model during generation, and we never share your information with third parties. You can delete your account and all associated data at any time from your settings."
    },
    {
        question: "Why should I use this instead of just editing my resume manually?",
        answer: "Tailoring a resume manually for each job takes 30-60 minutes—analyzing the job description, reordering bullets, adjusting keywords, and reformatting. TAILOR does this in under 30 seconds while ensuring ATS compatibility. When you're applying to 20+ jobs, that's 10-20 hours saved. Plus, our AI catches keyword matches you might miss."
    },
    {
        question: "Is the ATS score actually reliable?",
        answer: "Yes. Our ATS scorer uses semantic matching (not just keyword counting) to evaluate how well your resume aligns with the job description. It analyzes skills, experience levels, education requirements, and domain-specific terminology. Our scores correlate closely with industry-standard tools like Jobscan, and our Pro users see measurably higher callback rates."
    },
    {
        question: "I was recently laid off. Is this really built for my situation?",
        answer: "Absolutely—TAILOR was designed with laid-off professionals in mind. Upload all your old resumes, work docs, and even past job descriptions. Our AI helps you quickly generate different resume versions for adjacent roles (e.g., Product Manager vs. Program Manager vs. Technical PM), keeping your narrative coherent even if your path has been disrupted."
    },
    {
        question: "Can I cancel anytime? What's the refund policy?",
        answer: "Yes, you can cancel your subscription at any time from your account settings—no questions asked. You'll continue to have access until the end of your billing period. If you're unsatisfied within the first 7 days of a paid plan, we offer a full refund. Just contact support."
    },
    {
        question: "What formats can I download my resume in?",
        answer: "You can download your tailored resume as a PDF (optimized for ATS and human readability) or as a DOCX file if you want to make additional edits in Microsoft Word or Google Docs. The formatting is clean, single-column, and designed to survive applicant tracking systems."
    },
    {
        question: "Does this work for my industry?",
        answer: "TAILOR works across industries, with especially strong performance in knowledge work—tech, product, finance, marketing, consulting, operations, healthcare, and engineering. Because everything is grounded in your actual experience and the specific job description, it adapts to different titles and functions rather than forcing a one-size-fits-all template."
    },
    {
        question: "How is this different from using ChatGPT to rewrite my resume?",
        answer: "ChatGPT doesn't know your actual career history—it can only work with what you paste in each session. TAILOR builds a permanent, structured profile from all your documents, then uses RAG to retrieve the most relevant parts for each job. You also get ATS scoring, consistent formatting, version management, and a specialized resume engine—not a general-purpose chatbot."
    },
    {
        question: "What can I actually do on the free plan?",
        answer: "The free plan includes 5 tailored resume generations per month, access to the resume builder, and the ability to upload up to 30 career documents. It's enough to test the quality and see real results before upgrading. No credit card required to start."
    },
    {
        question: "Do you guarantee I'll get more interviews?",
        answer: "While we can't guarantee specific outcomes (no honest tool can), our users consistently report higher callback rates after switching to tailored resumes. The logic is straightforward: ATS-optimized resumes that closely match job requirements are more likely to pass automated filters and catch a recruiter's attention. You can try it risk-free with the free tier."
    },
    {
        question: "How fast is the resume generation, really?",
        answer: "Most resumes generate in 15-30 seconds. This includes analyzing the job description, matching it against your career profile, rewriting relevant bullet points, and formatting the output. Compare that to the 30-60 minutes it takes to do this manually for each application."
    }
];

export function FAQSection() {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    return (
        <section id="faq" className="py-16 md:py-24 relative">
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
