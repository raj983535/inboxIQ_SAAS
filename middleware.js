import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isLiveClerk = clerkKey && !clerkKey.includes('placeholder') && !clerkKey.includes('mock') && !clerkKey.includes('Y2xlcmsuaW5ib3hpcS5kZXYk');

const isProtectedRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/onboarding(.*)',
  '/settings(.*)',
  '/billing(.*)',
  '/admin/dashboard(.*)',
  '/admin/users(.*)',
  '/admin/subscriptions(.*)',
  '/admin/connections(.*)',
  '/admin/workflows(.*)',
  '/admin/reports(.*)',
  '/admin/errors(.*)',
  '/admin/system(.*)',
  '/admin/settings(.*)',
]);

export default function middleware(req, evt) {
  if (isLiveClerk) {
    return clerkMiddleware((auth, req) => {
      if (isProtectedRoute(req)) {
        auth().protect();
      }
    })(req, evt);
  }

  // Graceful passthrough for local dev testing
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
