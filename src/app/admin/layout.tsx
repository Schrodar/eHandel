import Link from 'next/link';
import type { ReactNode } from 'react';

type AdminLayoutProps = {
  children: ReactNode;
};

const navItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/products', label: 'Produkter' },
  { href: '/admin/categories', label: 'Kategorier' },
  { href: '/admin/materials', label: 'Material' },
  { href: '/admin/colors', label: 'Färger' },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-8">
        <aside className="hidden w-56 shrink-0 rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:block">
          <div className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Admin
          </div>
          <nav className="space-y-1 text-sm">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
