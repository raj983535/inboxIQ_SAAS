import React from 'react';
import { PricingViewClient } from '@/components/public/pricing-view';

export const metadata = {
  title: 'InboxIQ Pricing & Plans | Accessible Email Intelligence',
  description: 'Transparent SaaS subscription pricing for InboxIQ. Tailored plans for Professors, Students, and Working Professionals in INR and USD.',
};

export default function PricingPage() {
  return <PricingViewClient />;
}
