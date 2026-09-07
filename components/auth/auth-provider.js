'use client';

import React from 'react';
import { ClerkProvider } from '@clerk/nextjs';

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isLiveClerk = Boolean(
  clerkKey &&
  clerkKey.startsWith('pk_') &&
  !clerkKey.includes('placeholder') &&
  !clerkKey.includes('mock')
);

export function AuthProvider({ children }) {
  if (isLiveClerk) {
    return <ClerkProvider publishableKey={clerkKey}>{children}</ClerkProvider>;
  }

  // Graceful fallback for local development preview before entering production Clerk keys
  return <>{children}</>;
}
