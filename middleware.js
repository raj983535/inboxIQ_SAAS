import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isLiveClerk = Boolean(
  clerkKey &&
  clerkKey.startsWith('pk_') &&
  !clerkKey.includes('placeholder') &&
  !clerkKey.includes('mock')
);

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
        const { userId } = auth();
        if (!userId) {
          // Keep user within inboxiq.online domain rather than unconfigured accounts.inboxiq.online DNS
          const signInUrl = new URL('/sign-in', req.url);
          signInUrl.searchParams.set('redirect_url', req.url);
          return NextResponse.redirect(signInUrl);
        }
      }
    })(req, evt);
  }

  // Graceful passthrough
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
