'use client';

import { motion } from 'framer-motion';

const companies = [
    "Google", "Microsoft", "Amazon", "Meta", "Netflix", "Apple", "Tesla", "Uber", "Airbnb", "Spotify"
];

export function TrustSection() {
    return (
        <section className="py-12 border-y border-border bg-muted/10 overflow-hidden">
            <div className="container px-4 mx-auto mb-8 text-center">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
                    Trusted by candidates at top companies
                </p>
            </div>

            <div className="relative flex overflow-x-hidden group">
                <div className="animate-marquee whitespace-nowrap flex items-center gap-16 px-8">
                    {[...companies, ...companies, ...companies].map((company, index) => (
                        <span
                            key={index}
                            className="text-2xl font-bold text-muted-foreground/20 font-display uppercase tracking-tighter hover:text-muted-foreground/40 transition-colors cursor-default"
                        >
                            {company}
                        </span>
                    ))}
                </div>

                <div className="absolute top-0 animate-marquee2 whitespace-nowrap flex items-center gap-16 px-8">
                    {[...companies, ...companies, ...companies].map((company, index) => (
                        <span
                            key={index}
                            className="text-2xl font-bold text-muted-foreground/20 font-display uppercase tracking-tighter hover:text-muted-foreground/40 transition-colors cursor-default"
                        >
                            {company}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}
