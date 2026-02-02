import type { ReactNode } from 'react';

type AdminLayoutProps = {
  children: ReactNode;
};

// NOTE: Keep this layout "neutral". Protected admin chrome lives in
// /admin/(protected)/layout.tsx so that unauthenticated users never see admin HTML.
export default function AdminLayout({ children }: AdminLayoutProps) {
  return <>{children}</>;
}
