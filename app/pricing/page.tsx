'use client';

import { useState } from 'react';
import { Navbar } from '@/components/unauth/navbar';
import { PricingSection } from '@/components/unauth/pricing-section';
import { AuthModal } from '@/components/auth-modal';
import { Footer } from '@/components/unauth/footer';

export default function PricingPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/30 bg-grid-pattern">
      <div className="relative z-10">
        <Navbar onOpenAuth={() => setShowAuthModal(true)} />
        
        <main className="pt-20 md:pt-24 min-h-screen">
            <PricingSection onOpenAuth={() => setShowAuthModal(true)} />
        </main>

        <Footer />
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}






