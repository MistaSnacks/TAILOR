'use client';

import { Twitter, Linkedin, Github, Mail } from 'lucide-react';
import Link from 'next/link';

export function Footer() {
    return (
        <footer className="border-t border-border bg-card pt-20 pb-10">
            <div className="container px-4 mx-auto">
                <div className="grid md:grid-cols-4 gap-12 mb-16">
                    <div className="col-span-1 md:col-span-2">
                        <Link href="/" className="font-display font-bold text-2xl tracking-tight mb-6 block">
                            T<span className="text-primary">AI</span>LOR
                        </Link>
                        <p className="text-muted-foreground max-w-sm mb-8">
                            The world&apos;s most advanced AI resume tailoring platform. Built for professionals who demand excellence.
                        </p>
                        <div className="flex gap-4">
                            <a href="#" className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                                <Twitter className="w-5 h-5" />
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                                <Linkedin className="w-5 h-5" />
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                                <Github className="w-5 h-5" />
                            </a>
                        </div>
                    </div>

                    <div>
                        <h4 className="font-semibold text-foreground mb-6">Product</h4>
                        <ul className="space-y-4 text-muted-foreground">
                            <li><Link href="#" className="hover:text-primary transition-colors">Features</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">Pricing</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">Testimonials</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">FAQ</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="font-semibold text-foreground mb-6">Company</h4>
                        <ul className="space-y-4 text-muted-foreground">
                            <li><Link href="#" className="hover:text-primary transition-colors">About</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">Blog</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">Careers</Link></li>
                            <li><Link href="#" className="hover:text-primary transition-colors">Contact</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
                    <p>© {new Date().getFullYear()} T-AI-LOR. All rights reserved.</p>
                    <div className="flex gap-8">
                        <Link href="#" className="hover:text-foreground transition-colors">Privacy Policy</Link>
                        <Link href="#" className="hover:text-foreground transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
