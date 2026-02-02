import './globals.css';
import { TransitionProvider } from '@/components/TransitionProvider';
import { CartProvider } from '@/context/CartProvider';
import { ShopFiltersProvider } from '@/context/ShopFiltersProvider';
import { Suspense } from 'react';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv">
      <body>
        <CartProvider>
          <Suspense fallback={null}>
            <ShopFiltersProvider>
              <TransitionProvider>
                <div className="flex flex-col min-h-screen">{children}</div>
              </TransitionProvider>
            </ShopFiltersProvider>
          </Suspense>
        </CartProvider>
      </body>
    </html>
  );
}
