'use client';

import { useState } from 'react';
import { Navbar } from '@/components/unauth/navbar';
import { AuthModal } from '@/components/auth-modal';
import { Footer } from '@/components/unauth/footer';

export default function PrivacyPage() {
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground relative selection:bg-primary/30 bg-grid-pattern">
      <div className="relative z-10">
        <Navbar onOpenAuth={() => setShowAuthModal(true)} />
        
        <main className="pt-24 md:pt-32 pb-20 container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold font-display mb-8">Privacy Policy</h1>
          <p className="text-muted-foreground mb-12">Last updated: January 6, 2025</p>

          <div className="prose prose-invert max-w-none prose-headings:font-display prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground">
            <section>
              <h2>1. Introduction</h2>
              <p>
                At T-AI-LOR, we take your privacy seriously. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our AI resume tailoring service. Please read this privacy policy carefully.
              </p>
            </section>

            <section>
              <h2>2. Information We Collect</h2>
              <p>
                We collect information that you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li><strong>Personal Information:</strong> Name, email address, and account credentials when you register.</li>
                <li><strong>Document Data:</strong> Resumes, cover letters, and job descriptions you upload or input for analysis.</li>
                <li><strong>Usage Data:</strong> Information about how you use the Service, including generation history and feature usage.</li>
                <li><strong>Payment Information:</strong> Billing details processed securely by our payment providers (we do not store full credit card numbers).</li>
              </ul>
            </section>

            <section>
              <h2>3. How We Use Your Information</h2>
              <p>
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-4">
                <li>Provide, maintain, and improve our Service.</li>
                <li>Process your resume and job description data to generate tailored content using AI algorithms.</li>
                <li>Manage your account and subscription.</li>
                <li>Communicate with you about updates, security alerts, and support messages.</li>
                <li>Monitor and analyze trends and usage to improve user experience.</li>
              </ul>
            </section>

            <section>
              <h2>4. AI Data Processing</h2>
              <p>
                Our Service uses artificial intelligence to analyze and generate text. The documents you upload are processed by our AI models to provide the tailoring service. We do not use your personal resumes or private data to train our public AI models without your explicit consent. Your personal data remains yours.
              </p>
            </section>

            <section>
              <h2>5. Data Security</h2>
              <p>
                We implement appropriate technical and organizational security measures to protect your personal information. However, please be aware that no method of transmission over the internet or method of electronic storage is 100% secure. While we strive to protect your personal information, we cannot guarantee its absolute security.
              </p>
            </section>

            <section>
              <h2>6. Sharing Your Information</h2>
              <p>
                We do not sell, trade, or rent your personal identification information to others. We may share generic aggregated demographic information not linked to any personal identification information regarding visitors and users with our business partners and advertisers. We may disclose your information if required by law or to protect our rights.
              </p>
            </section>

            <section>
              <h2>7. Third-Party Services</h2>
              <p>
                We may use third-party service providers to help us operate our business and the Service, such as cloud hosting, payment processing, and analytics. These third parties have access to your information only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.
              </p>
            </section>

            <section>
              <h2>8. Your Rights</h2>
              <p>
                Depending on your location, you may have rights regarding your personal data, including the right to access, correct, delete, or restrict use of your data. You can manage most of your data directly within your account settings or by contacting us.
              </p>
            </section>

            <section>
              <h2>9. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page. You are advised to review this Privacy Policy periodically for any changes.
              </p>
            </section>

            <section>
              <h2>10. Contact Us</h2>
              <p>
                If you have any questions about this Privacy Policy, please contact us at privacy@tailor.app.
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


