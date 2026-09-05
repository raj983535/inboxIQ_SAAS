'use client';

import React from 'react';
import { ClerkProvider } from '@clerk/nextjs';

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
// Check if key is a real Clerk key (real clerk keys are from clerk.accounts.dev or custom domain)
const isLiveClerk = clerkKey && !clerkKey.includes('placeholder') && !clerkKey.includes('mock') && !clerkKey.includes('Y2xlcmsuaW5ib3hpcS5kZXYk');

export function AuthProvider({ children }) {
  if (isLiveClerk) {
    return <ClerkProvider publishableKey={clerkKey}>{children}</ClerkProvider>;
  }

  // Graceful fallback for local development preview before entering production Clerk keys
  return <>{children}</>;
}
