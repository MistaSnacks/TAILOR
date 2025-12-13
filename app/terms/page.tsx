'use client';

import { useState } from 'react';
import { Navbar } from '@/components/unauth/navbar';
import { AuthModal } from '@/components/auth-modal';
import { Footer } from '@/components/unauth/footer';

export default function TermsPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/30 bg-grid-pattern">
      <div className="relative z-10">
        <Navbar onOpenAuth={() => setShowAuthModal(true)} />
        
        <main className="pt-24 md:pt-32 pb-20 container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold font-display mb-8">Terms of Service</h1>
          <p className="text-muted-foreground mb-12">Last updated: January 1, 2024</p>

          <div className="prose prose-invert max-w-none prose-headings:font-display prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground">
            <section>
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing and using T-AI-LOR ("the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service. These terms apply to all visitors, users, and others who access or use the Service.
              </p>
            </section>

            <section>
              <h2>2. Description of Service</h2>
              <p>
                T-AI-LOR provides AI-powered resume tailoring and optimization services. We help users customize their resumes for specific job descriptions using artificial intelligence technology. The Service includes resume parsing, content generation, and document formatting features.
              </p>
            </section>

            <section>
              <h2>3. User Accounts</h2>
              <p>
                To access certain features of the Service, you must create an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate and complete information when creating your account.
              </p>
            </section>

            <section>
              <h2>4. Subscription and Billing</h2>
              <p>
                T-AI-LOR offers both free and paid subscription tiers. By selecting a paid service, you agree to pay the specified fees. Subscription fees are billed in advance on a recurring basis (monthly or quarterly) depending on your plan. You may cancel your subscription at any time, but no refunds will be provided for the current billing period.
              </p>
            </section>

            <section>
              <h2>5. User Content</h2>
              <p>
                You retain all rights to the personal data, resumes, and other documents you upload to the Service ("User Content"). By uploading User Content, you grant T-AI-LOR a license to use, process, and store your content solely for the purpose of providing the Service to you. We do not claim ownership of your User Content.
              </p>
            </section>

            <section>
              <h2>6. Acceptable Use</h2>
              <p>
                You agree not to use the Service for any unlawful purpose or in any way that interrupts, damages, or impairs the Service. You specifically agree not to upload false, misleading, or malicious content, or to attempt to reverse engineer the AI models used by the Service.
              </p>
            </section>

            <section>
              <h2>7. Disclaimer of Warranties</h2>
              <p>
                The Service is provided "as is" and "as available" without warranties of any kind, whether express or implied. We do not guarantee that the Service will function without interruption or errors, or that the results generated will guarantee job interviews or employment offers.
              </p>
            </section>

            <section>
              <h2>8. Limitation of Liability</h2>
              <p>
                To the maximum extent permitted by law, T-AI-LOR shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your access to or use of, or inability to access or use, the Service.
              </p>
            </section>

            <section>
              <h2>9. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. We will notify users of any material changes by posting the new Terms of Service on this page. Your continued use of the Service after any such changes constitutes your acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2>10. Contact Us</h2>
              <p>
                If you have any questions about these Terms, please contact us at support@tailor.app.
              </p>
            </section>
          </div>
        </main>

        <Footer />
      </div>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </div>
  );
}



