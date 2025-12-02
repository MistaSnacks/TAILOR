'use client';

const companies = [
    "Stripe", "Figma", "Notion", "Linear", "Vercel", "Anthropic", "OpenAI"
];

export function TrustSection() {
    return (
        <section className="py-8 md:py-12 border-y border-border bg-muted/10 overflow-hidden">
            <div className="container px-4 mx-auto mb-4 md:mb-8 text-center">
                <p className="text-xs md:text-sm font-medium text-muted-foreground uppercase tracking-wider md:tracking-widest">
                    Tailor users landed roles at top companies such as
                </p>
            </div>

            <div className="relative flex overflow-x-hidden group">
                <div className="animate-marquee whitespace-nowrap flex items-center gap-8 md:gap-16 px-4 md:px-8">
                    {[...companies, ...companies, ...companies].map((company, index) => (
                        <span
                            key={index}
                            className="text-lg md:text-2xl font-bold text-muted-foreground/20 font-display uppercase tracking-tighter hover:text-muted-foreground/40 transition-colors cursor-default"
                        >
                            {company}
                        </span>
                    ))}
                </div>

                <div className="absolute top-0 animate-marquee2 whitespace-nowrap flex items-center gap-8 md:gap-16 px-4 md:px-8">
                    {[...companies, ...companies, ...companies].map((company, index) => (
                        <span
                            key={index}
                            className="text-lg md:text-2xl font-bold text-muted-foreground/20 font-display uppercase tracking-tighter hover:text-muted-foreground/40 transition-colors cursor-default"
                        >
                            {company}
                        </span>
                    ))}
                </div>
            </div>
        </section>
    );
}
