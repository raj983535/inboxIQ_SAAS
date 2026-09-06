'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, Sparkles, Menu, X, ArrowRight } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { Button } from '@/components/ui/button';

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200/80 dark:border-neutral-800/80 bg-white/80 dark:bg-[#080c14]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 font-bold text-lg text-neutral-900 dark:text-neutral-100">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Mail className="w-5 h-5" />
          </div>
          <span className="tracking-tight text-xl font-extrabold bg-gradient-to-r from-neutral-900 via-neutral-800 to-neutral-600 dark:from-white dark:via-neutral-200 dark:to-neutral-400 bg-clip-text text-transparent">
            Inbox<span className="text-emerald-600 dark:text-emerald-400">IQ</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-600 dark:text-neutral-400">
          <Link href="/#how-it-works" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            How It Works
          </Link>
          <Link href="/#features" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            Features
          </Link>
          <Link href="/#sample-report" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            Sample Report
          </Link>
          <Link href="/pricing" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            Pricing
          </Link>
          <Link href="/#faq" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
            FAQ
          </Link>
        </nav>

        {/* Right Action Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <Link href="/sign-in">
            <Button variant="ghost" size="sm">
              Sign In
            </Button>
          </Link>
          <Link href="/sign-up">
            <Button variant="primary" size="sm">
              Get Started <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden px-4 pt-2 pb-6 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#080c14] space-y-3">
          <Link
            href="/#how-it-works"
            onClick={() => setMobileOpen(false)}
            className="block py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200"
          >
            How It Works
          </Link>
          <Link
            href="/#features"
            onClick={() => setMobileOpen(false)}
            className="block py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200"
          >
            Features
          </Link>
          <Link
            href="/pricing"
            onClick={() => setMobileOpen(false)}
            className="block py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200"
          >
            Pricing
          </Link>
          <Link
            href="/#faq"
            onClick={() => setMobileOpen(false)}
            className="block py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200"
          >
            FAQ
          </Link>
          <div className="pt-4 flex flex-col gap-2">
            <Link href="/sign-in" onClick={() => setMobileOpen(false)}>
              <Button variant="outline" className="w-full">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up" onClick={() => setMobileOpen(false)}>
              <Button variant="primary" className="w-full">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
