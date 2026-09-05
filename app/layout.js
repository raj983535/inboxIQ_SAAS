import { AuthProvider } from '@/components/auth/auth-provider';
import { ThemeProvider } from '@/components/theme-provider';
import './globals.css';

export const metadata = {
  title: 'InboxIQ — AI-Powered Email Intelligence for Professionals',
  description: 'Connect your Gmail accounts, let external intelligence organize your actionable priorities, and receive structured daily briefings in Gmail and Google Drive.',
  keywords: ['Email Intelligence', 'Daily Email Digest', 'AI Email Report', 'Faculty Productivity', 'Executive Email Summary'],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased min-h-screen bg-slate-50 dark:bg-[#080c14] text-slate-900 dark:text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-700 dark:selection:text-emerald-300">
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
