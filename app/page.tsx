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
import { Bot, FileSearch, Shield, Zap } from 'lucide-react';

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
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            <FeatureCard
              icon={FileSearch}
              title="One Upload, Every Job"
              description="Upload your resumes once. We parse your entire career—roles, skills, achievements—into a searchable profile that powers every tailored resume."
              delay={0.1}
            />
            <FeatureCard
              icon={Bot}
              title="RAG-Powered Tailoring"
              description="Our AI doesn't guess. It retrieves the most relevant parts of YOUR experience for each job, then rewrites bullets to match the role."
              delay={0.2}
            />
            <FeatureCard
              icon={Zap}
              title="30-Second ATS Scores"
              description="See exactly how well your resume matches before you apply. Real-time scoring helps you hit 80%+ and pass automated filters."
              delay={0.3}
            />
            <FeatureCard
              icon={Shield}
              title="100% Your Experience"
              description="No hallucinations, no fabricated skills. Every bullet point traces back to your uploaded documents. Truthful tailoring you can stand behind."
              delay={0.4}
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
