'use client';

import { motion } from 'framer-motion';
import { Star, CheckCircle } from 'lucide-react';

const testimonials = [
    {
        name: "Sarah Chen",
        role: "Product Manager",
        company: "TechFlow",
        content: "I was struggling to get interviews until I started using T-AI-LOR. The RAG technology actually understands what hiring managers are looking for.",
        rating: 5
    },
    {
        name: "Michael Ross",
        role: "Senior Developer",
        company: "DataSystems",
        content: "The ability to tailor my resume for every single application in seconds is a game changer. I landed my dream job in 2 weeks.",
        rating: 5
    },
    {
        name: "Jessica Wu",
        role: "UX Designer",
        company: "CreativeLabs",
        content: "Finally, an AI tool that doesn't sound robotic. The output is natural, professional, and perfectly aligned with the job description.",
        rating: 5
    }
];

export function TestimonialsSection() {
    return (
        <section id="testimonials" className="py-16 md:py-24 relative">
            <div className="container px-4 mx-auto">
                <div className="text-center mb-10 md:mb-16">
                    <h2 className="text-2xl md:text-5xl font-bold font-display mb-4 md:mb-6">
                        Loved by <span className="text-secondary">Thousands</span>
                    </h2>
                    <p className="text-muted-foreground max-w-2xl mx-auto text-base md:text-lg">
                        Join thousands of professionals who have accelerated their careers with T-AI-LOR.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-4 md:gap-8">
                    {testimonials.map((testimonial, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className="p-5 md:p-8 rounded-xl md:rounded-2xl glass-card border border-white/5 relative group hover:border-secondary/30 transition-colors"
                        >
                            <div className="flex items-center gap-1 mb-3 md:mb-4">
                                {[...Array(testimonial.rating)].map((_, i) => (
                                    <Star key={i} className="w-3.5 md:w-4 h-3.5 md:h-4 fill-yellow-500 text-yellow-500" />
                                ))}
                            </div>

                            <p className="text-sm md:text-lg mb-4 md:mb-6 text-foreground/90 leading-relaxed">
                                &quot;{testimonial.content}&quot;
                            </p>

                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-semibold text-sm md:text-base text-foreground">{testimonial.name}</div>
                                    <div className="text-xs md:text-sm text-muted-foreground">{testimonial.role} at {testimonial.company}</div>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] md:text-xs font-medium text-primary bg-primary/10 px-1.5 md:px-2 py-0.5 md:py-1 rounded-full">
                                    <CheckCircle className="w-2.5 md:w-3 h-2.5 md:h-3" /> Verified
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
