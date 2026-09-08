'use client';

import React, { useEffect, useState } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import { useTheme } from 'next-themes';

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isLiveClerk = Boolean(
  clerkKey &&
  clerkKey.startsWith('pk_') &&
  !clerkKey.includes('placeholder') &&
  !clerkKey.includes('mock')
);

export function AuthProvider({ children }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (isLiveClerk) {
    const isDark = mounted && resolvedTheme === 'dark';
    return (
      <ClerkProvider
        publishableKey={clerkKey}
        appearance={{
          baseTheme: isDark ? dark : undefined,
          variables: {
            colorPrimary: '#10b981',
          },
        }}
      >
        {children}
      </ClerkProvider>
    );
  }

  // Graceful fallback for local development preview before entering production Clerk keys
  return <>{children}</>;
}
