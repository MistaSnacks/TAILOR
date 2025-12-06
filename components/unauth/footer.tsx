'use client';

import { Twitter, Linkedin, Github } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
    return (
        <footer className="border-t border-border bg-card pt-12 md:pt-20 pb-8 md:pb-10">
            <div className="container px-4 mx-auto">
                <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-12 mb-10 md:mb-16">
                    <div className="max-w-sm">
                        <Link href="/" className="font-display font-bold text-xl md:text-2xl tracking-tight mb-4 md:mb-6 block">
                            T<span className="text-primary">AI</span>LOR
                        </Link>
                        <p className="text-sm md:text-base text-muted-foreground mb-6 md:mb-8">
                            The world&apos;s most advanced AI resume tailoring platform. Built for professionals who demand excellence.
                        </p>
                        <div className="flex gap-3">
                            <a href="#" className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-muted/50 flex items-center justify-center active:bg-muted transition-colors text-muted-foreground hover:text-primary">
                                <Twitter className="w-4 h-4 md:w-5 md:h-5" />
                            </a>
                            <a href="#" className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-muted/50 flex items-center justify-center active:bg-muted transition-colors text-muted-foreground hover:text-primary">
                                <Linkedin className="w-4 h-4 md:w-5 md:h-5" />
                            </a>
                            <a href="#" className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-muted/50 flex items-center justify-center active:bg-muted transition-colors text-muted-foreground hover:text-primary">
                                <Github className="w-4 h-4 md:w-5 md:h-5" />
                            </a>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold text-sm md:text-base text-foreground mb-4 md:mb-6">Product</h4>
                        <ul className="space-y-3 md:space-y-4 text-sm text-muted-foreground">
                            <li><Link href="/#features" className="active:text-primary transition-colors">Features</Link></li>
                            <li><Link href="/pricing" className="active:text-primary transition-colors">Pricing</Link></li>
                            <li><Link href="/#testimonials" className="active:text-primary transition-colors">Testimonials</Link></li>
                            <li><Link href="/#faq" className="active:text-primary transition-colors">FAQ</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-border pt-6 md:pt-8 flex flex-col md:flex-row justify-between items-center gap-3 md:gap-4 text-xs md:text-sm text-muted-foreground">
                    <p>© {new Date().getFullYear()} T-AI-LOR. All rights reserved.</p>
                    <div className="flex gap-6 md:gap-8">
                        <Link href="/privacy" className="active:text-foreground transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="active:text-foreground transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
