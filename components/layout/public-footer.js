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
              <span>AES-256 encrypted • Least-privilege OAuth scopes</span>
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
                  Pricing (₹499/mo)
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
              Legal & Compliance
            </h4>
            <ul className="space-y-2 text-xs md:text-sm">
              <li>
                <Link href="/terms" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Refund & Cancellation
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
                Razorpay & Google Verified API Gateway
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <p>© {new Date().getFullYear()} InboxIQ Technologies Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/terms" className="hover:underline">Terms</Link>
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <Link href="/refund-policy" className="hover:underline">Refunds</Link>
            <Link href="/contact" className="hover:underline">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
