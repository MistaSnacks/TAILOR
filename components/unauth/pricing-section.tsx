'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, X, Sparkles } from 'lucide-react';

interface PricingTier {
  name: string;
  description: string;
  monthlyPrice: number;
  quarterlyPrice: number; // Price per month when billed quarterly
  features: {
    included: boolean;
    text: string;
  }[];
  popular?: boolean;
  highlight?: boolean;
}

const tiers: PricingTier[] = [
  {
    name: 'Free',
    description: 'Perfect for getting started with your first tailored resume.',
    monthlyPrice: 0,
    quarterlyPrice: 0,
    features: [
      { included: true, text: 'Resume Builder' },
      { included: true, text: '5 Free Generations / Month' },
      { included: true, text: 'Upload up to 30 Documents' },
      { included: false, text: 'Job Builder' },
      { included: false, text: 'AI Career Coach' },
      { included: false, text: 'Unlimited Generations' },
    ],
  },
  {
    name: 'Standard',
    description: 'For serious job seekers applying to multiple roles.',
    monthlyPrice: 15,
    quarterlyPrice: 12,
    features: [
      { included: true, text: 'Resume Builder' },
      { included: true, text: 'Job Builder' },
      { included: true, text: 'Unlimited Generations' },
      { included: true, text: 'Upload up to 30 Documents' },
      { included: false, text: 'AI Career Coach' },
    ],
  },
  {
    name: 'Premium',
    description: 'The ultimate toolkit for accelerating your career.',
    monthlyPrice: 20,
    quarterlyPrice: 17,
    popular: true,
    highlight: true,
    features: [
      { included: true, text: 'Resume Builder' },
      { included: true, text: 'Job Builder' },
      { included: true, text: 'AI Career Coach' },
      { included: true, text: 'Unlimited Generations' },
      { included: true, text: 'Upload up to 30 Documents' },
    ],
  },
];

export function PricingSection({ onOpenAuth }: { onOpenAuth: () => void }) {
  const [isQuarterly, setIsQuarterly] = useState(false);

  return (
    <section id="pricing" className="py-20 md:py-32 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -z-10" />

      <div className="container px-4 mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-3xl md:text-5xl font-bold font-display mb-6 text-foreground"
          >
            Simple, Transparent Pricing
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg text-muted-foreground mb-8"
          >
            Choose the plan that fits your career goals. No hidden fees.
          </motion.p>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center justify-center gap-4"
          >
            <span className={`text-sm font-medium ${!isQuarterly ? 'text-foreground' : 'text-muted-foreground'}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsQuarterly(!isQuarterly)}
              className="relative w-14 h-7 bg-muted rounded-full p-1 transition-colors hover:bg-muted/80"
            >
              <div
                className={`w-5 h-5 bg-primary rounded-full shadow-sm transition-transform ${isQuarterly ? 'translate-x-7' : 'translate-x-0'
                  }`}
              />
            </button>
            <span className={`text-sm font-medium ${isQuarterly ? 'text-foreground' : 'text-muted-foreground'}`}>
              Quarterly <span className="text-primary text-xs font-bold">(Save up to 20%)</span>
            </span>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
          {tiers.map((tier, index) => (
            <PricingCard
              key={tier.name}
              tier={tier}
              isQuarterly={isQuarterly}
              delay={0.1 * index}
              onOpenAuth={onOpenAuth}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingCard({
  tier,
  isQuarterly,
  delay,
  onOpenAuth,
}: {
  tier: PricingTier;
  isQuarterly: boolean;
  delay: number;
  onOpenAuth: () => void;
}) {
  const price = isQuarterly ? tier.quarterlyPrice : tier.monthlyPrice;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      className={`relative p-8 rounded-2xl border flex flex-col ${tier.highlight
          ? 'bg-gradient-to-b from-primary/10 via-background to-background border-primary/50 shadow-lg shadow-primary/10'
          : 'bg-background/50 border-border glass-card hover:border-primary/30 transition-colors'
        }`}
    >
      {tier.popular && (
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary via-secondary to-primary animate-shimmer bg-[length:200%_auto] text-primary-foreground text-xs font-bold px-3 py-1 rounded-full shadow-lg">
          Most Popular
        </div>
      )}

      <div className="mb-8">
        <h3 className="text-xl font-bold font-display mb-2 text-foreground">{tier.name}</h3>
        <p className="text-sm text-muted-foreground min-h-[40px]">{tier.description}</p>
      </div>

      <div className="mb-8">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-foreground">${price}</span>
          <span className="text-muted-foreground">/mo</span>
        </div>
        {isQuarterly && tier.monthlyPrice > 0 && (
          <p className="text-xs text-muted-foreground mt-2">
            Billed ${price * 3} every 3 months
          </p>
        )}
      </div>

      <ul className="space-y-4 mb-8 flex-1">
        {tier.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3">
            {feature.included ? (
              <div className="mt-0.5 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Check className="w-3 h-3 text-primary" />
              </div>
            ) : (
              <div className="mt-0.5 w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                <X className="w-3 h-3 text-muted-foreground" />
              </div>
            )}
            <span className={`text-sm ${feature.included ? 'text-foreground' : 'text-muted-foreground/60'}`}>
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={onOpenAuth}
        className={`w-full py-3 px-6 rounded-xl font-semibold transition-all ${tier.highlight
            ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20'
            : 'bg-muted/50 text-foreground hover:bg-muted border border-border'
          }`}
      >
        {tier.monthlyPrice === 0 ? 'Get Started Free' : 'Choose Plan'}
      </button>
    </motion.div>
  );
}

