'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { AuthModal } from '@/components/auth-modal';
import { Navbar } from '@/components/unauth/navbar';
import { HeroSection } from '@/components/unauth/hero-section';
import { FeatureCard } from '@/components/unauth/feature-card';
import { HowItWorks } from '@/components/unauth/how-it-works';
import { TrustSection } from '@/components/unauth/trust-section';
import { TestimonialsSection } from '@/components/unauth/testimonials-section';
import { FAQSection } from '@/components/unauth/faq-section';
import { Footer } from '@/components/unauth/footer';
import { Bot, FileSearch, Zap } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  console.log('🏠 Landing Page - User:', user, 'Loading:', loading);

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/30 bg-grid-pattern">
      <div className="relative z-10">
        <Navbar onOpenAuth={() => setShowAuthModal(true)} />

        <HeroSection onOpenAuth={() => setShowAuthModal(true)} />

        <TrustSection />

        <section id="features" className="py-12 md:py-24 container px-4 mx-auto">
          <div className="grid md:grid-cols-3 gap-4 md:gap-8">
            <FeatureCard
              icon={FileSearch}
              title="Smart Document Analysis"
              description="Upload your resumes and we'll extract your skills, experience, and achievements to build your career profile."
              delay={0.1}
            />
            <FeatureCard
              icon={Bot}
              title="AI-Powered Matching"
              description="Our AI reads job descriptions and rewrites your resume to highlight exactly what employers are looking for."
              delay={0.2}
            />
            <FeatureCard
              icon={Zap}
              title="Instant ATS Optimization"
              description="Get a perfectly tailored resume with your match score in seconds—no more guessing if you'll pass the filter."
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
