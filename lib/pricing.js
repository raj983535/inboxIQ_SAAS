/**
 * Centralized Pricing & Plans Configuration for InboxIQ
 * Supports India (INR ₹) and International (USD $) across all professions.
 */

export const CURRENCIES = {
  INR: {
    code: 'INR',
    symbol: '₹',
    label: 'India (INR ₹)',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    label: 'International (USD $)',
  },
};

export const PLANS = {
  faculty: {
    id: 'plan_faculty_pro',
    name: 'InboxIQ Pro (Faculty & Professional)',
    target: 'Professor / Teacher & Working Professionals',
    pricing: {
      INR: { amount: 499, formatted: '₹499', period: '/ month' },
      USD: { amount: 8, formatted: '$8', period: '/ month' },
    },
    features: [
      'Connect up to 2 Gmail accounts concurrently',
      'Daily morning executive email briefing in Gmail',
      'Automatic PDF archival to Google Drive (InboxIQ / Daily Reports)',
      'Custom delivery schedule & IANA timezone',
      'Factual priorities, student & department action items extraction',
      'AES-256-GCM encrypted token security',
    ],
  },
  student: {
    id: 'plan_student_pro',
    name: 'InboxIQ Student',
    target: 'College Students & Researchers',
    pricing: {
      INR: { amount: 99, formatted: '₹99', period: '/ month' },
      USD: { amount: 4, formatted: '$4', period: '/ month' },
    },
    features: [
      'Connect up to 2 Gmail accounts (College/Personal)',
      'Daily morning student briefing in Gmail',
      'Track assignments, exams, project deadlines & attendance notices',
      'Internship, placement & scholarship opportunities highlighting',
      'Automatic PDF archival to Google Drive',
      'Custom morning delivery time',
    ],
  },
  others: {
    id: 'plan_professional_pro',
    name: 'InboxIQ Professional',
    target: 'Knowledge Workers & Executives',
    pricing: {
      INR: { amount: 499, formatted: '₹499', period: '/ month' },
      USD: { amount: 8, formatted: '$8', period: '/ month' },
    },
    features: [
      'Connect up to 2 Gmail accounts concurrently',
      'Daily executive email briefing in Gmail',
      'Meeting follow-ups, pending replies & client deadline tracking',
      'Automatic PDF archival to Google Drive',
      'Custom delivery schedule & IANA timezone',
      'AES-256-GCM encrypted token security',
    ],
  },
};

/**
 * Helper to retrieve plan details based on profession and currency
 */
export function getPlanForProfession(profession = 'professor_teacher', currency = 'INR') {
  let planKey = 'faculty';
  if (profession === 'student') {
    planKey = 'student';
  } else if (profession === 'others') {
    planKey = 'others';
  }

  const plan = PLANS[planKey];
  const activePricing = plan.pricing[currency] || plan.pricing.INR;

  return {
    ...plan,
    activePricing,
    currency,
  };
}
