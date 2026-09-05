import { PublicNavbar } from '@/components/layout/public-navbar';
import { PublicFooter } from '@/components/layout/public-footer';

export default function PublicLayout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
