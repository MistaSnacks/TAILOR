'use client';

import { Twitter, Linkedin, Instagram, Facebook } from 'lucide-react';
import Link from 'next/link';

// TikTok icon (not in lucide-react)
function TikTokIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
        </svg>
    );
}

export function Footer() {
    return (
        <footer className="border-t border-border bg-card pt-12 md:pt-20 pb-8 md:pb-10">
            <div className="container px-4 mx-auto">
                {/* Main Footer Grid */}
                <div className="grid grid-cols-2 md:grid-cols-6 gap-8 md:gap-12 mb-10 md:mb-16">
                    {/* Brand Column - Spans 2 cols on desktop */}
                    <div className="col-span-2">
                        <Link href="/" className="font-display font-bold text-xl md:text-2xl tracking-tight mb-4 md:mb-6 block">
                            T<span className="text-primary">AI</span>LOR
                        </Link>
                        <p className="text-sm md:text-base text-muted-foreground mb-6">
                            The AI resume engine that learns your entire career and crafts truthful, ATS-optimized resumes for every job you apply to.
                        </p>

                        {/* Social Icons */}
                        <div className="flex gap-2">
                            <a href="#" aria-label="Twitter" className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-primary/20 transition-colors text-muted-foreground hover:text-primary">
                                <Twitter className="w-4 h-4 md:w-5 md:h-5" />
                            </a>
                            <a href="#" aria-label="LinkedIn" className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-primary/20 transition-colors text-muted-foreground hover:text-primary">
                                <Linkedin className="w-4 h-4 md:w-5 md:h-5" />
                            </a>
                            <a href="#" aria-label="Instagram" className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-primary/20 transition-colors text-muted-foreground hover:text-primary">
                                <Instagram className="w-4 h-4 md:w-5 md:h-5" />
                            </a>
                            <a href="#" aria-label="Facebook" className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-primary/20 transition-colors text-muted-foreground hover:text-primary">
                                <Facebook className="w-4 h-4 md:w-5 md:h-5" />
                            </a>
                            <a href="#" aria-label="TikTok" className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-primary/20 transition-colors text-muted-foreground hover:text-primary">
                                <TikTokIcon className="w-4 h-4 md:w-5 md:h-5" />
                            </a>
                        </div>
                    </div>

                    {/* Product Column */}
                    <div>
                        <h4 className="font-semibold text-sm md:text-base text-foreground mb-4 md:mb-6">Product</h4>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li><Link href="/#features" className="hover:text-primary transition-colors">Features</Link></li>
                            <li><Link href="/#how-it-works" className="hover:text-primary transition-colors">How It Works</Link></li>
                            <li><Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
                            <li><Link href="/#testimonials" className="hover:text-primary transition-colors">Testimonials</Link></li>
                        </ul>
                    </div>

                    {/* Resources Column */}
                    <div>
                        <h4 className="font-semibold text-sm md:text-base text-foreground mb-4 md:mb-6">Resources</h4>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li><Link href="/#faq" className="hover:text-primary transition-colors">FAQ</Link></li>
                            <li><Link href="/blog" className="hover:text-primary transition-colors">Blog</Link></li>
                            <li><Link href="/resume-tips" className="hover:text-primary transition-colors">Resume Tips</Link></li>
                            <li><Link href="/ats-guide" className="hover:text-primary transition-colors">ATS Guide</Link></li>
                        </ul>
                    </div>

                    {/* Company Column */}
                    <div>
                        <h4 className="font-semibold text-sm md:text-base text-foreground mb-4 md:mb-6">Company</h4>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
                            <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
                            <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
                        </ul>
                    </div>

                    {/* Support Column */}
                    <div>
                        <h4 className="font-semibold text-sm md:text-base text-foreground mb-4 md:mb-6">Support</h4>
                        <ul className="space-y-3 text-sm text-muted-foreground">
                            <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
                            <li><Link href="/help" className="hover:text-primary transition-colors">Help Center</Link></li>
                            <li><a href="mailto:support@tailor.ai" className="hover:text-primary transition-colors">support@tailor.ai</a></li>
                        </ul>
                    </div>
                </div>



                {/* Bottom Bar */}
                <div className="border-t border-border pt-6 md:pt-8 flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4 text-xs md:text-sm text-muted-foreground">
                    <p>© {new Date().getFullYear()} TAILOR. All rights reserved.</p>
                    <p className="text-center md:text-right">Made with 💚 for job seekers everywhere</p>
                </div>
            </div>
        </footer>
    );
}
