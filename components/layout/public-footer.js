import React from 'react';
import Link from 'next/link';
import { Mail, Shield, Sparkles, ExternalLink } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-[#070a10] text-neutral-600 dark:text-neutral-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2 font-bold text-lg text-neutral-900 dark:text-neutral-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <Mail className="w-4 h-4" />
              </div>
              <span className="text-xl font-black">Inbox<span className="text-emerald-600 dark:text-emerald-400">IQ</span></span>
            </Link>
            <p className="text-xs md:text-sm text-neutral-500 dark:text-neutral-400 max-w-sm leading-relaxed">
              InboxIQ is an AI-powered email intelligence platform that turns busy Gmail inboxes into structured, actionable daily executive briefings delivered directly to your inbox and archived to Google Drive.
            </p>
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <Shield className="w-3.5 h-3.5 text-emerald-500" />
              <span>AES-256 encrypted • Least-privilege Google OAuth</span>
            </div>
            <div className="pt-1 text-xs text-neutral-500">
              Support:{' '}
              <a
                href="mailto:sahilrajdurgapur23@gmail.com"
                className="text-emerald-600 dark:text-emerald-400 font-mono hover:underline"
              >
                sahilrajdurgapur23@gmail.com
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-200 mb-3">
              Product
            </h4>
            <ul className="space-y-2 text-xs md:text-sm">
              <li>
                <Link href="/#how-it-works" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/#features" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Features
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Pricing &amp; Plans
                </Link>
              </li>
              <li>
                <Link href="/#sample-report" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Sample Briefing
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Control Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Compliance Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-200 mb-3">
              Legal &amp; Compliance
            </h4>
            <ul className="space-y-2 text-xs md:text-sm">
              <li>
                <Link href="/terms" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Terms &amp; Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Cancellation &amp; Refund
                </Link>
              </li>
              <li>
                <Link href="/shipping-policy" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Shipping Policy
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Contact Support
                </Link>
              </li>
            </ul>
          </div>

          {/* System & Administration */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-neutral-200 mb-3">
              System
            </h4>
            <ul className="space-y-2 text-xs md:text-sm">
              <li>
                <Link href="/admin/login" className="text-neutral-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1">
                  Admin Portal <ExternalLink className="w-3 h-3" />
                </Link>
              </li>
              <li>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">● Systems Operational</span>
              </li>
              <li className="pt-2 text-[11px] text-neutral-400">
                Razorpay &amp; Google Cloud Verified API Gateway
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>© {new Date().getFullYear()} InboxIQ. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <Link href="/terms" className="hover:underline">Terms &amp; Conditions</Link>
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link href="/refund-policy" className="hover:underline">Cancellation &amp; Refund</Link>
            <Link href="/shipping-policy" className="hover:underline">Shipping Policy</Link>
            <Link href="/contact" className="hover:underline">Contact</Link>
            <Link href="/pricing" className="hover:underline">Pricing</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
