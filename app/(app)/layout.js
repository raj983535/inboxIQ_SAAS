import { AppSidebar } from '@/components/layout/app-sidebar';
import { AccountProvider } from '@/context/account-context';

export default function AppLayout({ children }) {
  return (
    <AccountProvider>
      <div className="flex min-h-screen bg-slate-50/50 dark:bg-[#080c14]">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </AccountProvider>
  );
}
