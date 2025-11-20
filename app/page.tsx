'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { AuthModal } from '@/components/auth-modal';
import { HeroSection } from '@/components/unauth/hero-section';
import { FeatureCard } from '@/components/unauth/feature-card';
import { HowItWorks } from '@/components/unauth/how-it-works';
import { BackgroundBeams } from '@/components/unauth/background-beams';
import { TrustSection } from '@/components/unauth/trust-section';
import { TestimonialsSection } from '@/components/unauth/testimonials-section';
import { FAQSection } from '@/components/unauth/faq-section';
import { Footer } from '@/components/unauth/footer';
import { Bot, FileSearch, Zap } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Home() {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  console.log('🏠 Landing Page - User:', user, 'Loading:', loading);

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/30 bg-grid-pattern">
      <div className="relative z-10">
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/50 backdrop-blur-md">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="font-display font-bold text-2xl tracking-tight">
              T<span className="text-primary">AI</span>LOR
            </div>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              {user ? (
                <a
                  href="/dashboard"
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  Dashboard
                </a>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="text-sm font-medium hover:text-primary transition-colors"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </nav>

        <HeroSection onOpenAuth={() => setShowAuthModal(true)} />

        <TrustSection />

        <section className="py-24 container px-4 mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={FileSearch}
              title="Smart Parsing"
              description="We extract every detail from your resume and LinkedIn profile to create a comprehensive career profile."
              delay={0.1}
            />
            <FeatureCard
              icon={Bot}
              title="AI Tailoring"
              description="Our RAG engine analyzes job descriptions to highlight your most relevant experience for each role."
              delay={0.2}
            />
            <FeatureCard
              icon={Zap}
              title="Instant Optimization"
              description="Get a perfectly formatted, ATS-friendly resume in seconds, not hours."
              delay={0.3}
            />
          </div>
        </section>

        <HowItWorks />

        <TestimonialsSection />

        <FAQSection />

        <Footer />
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}
