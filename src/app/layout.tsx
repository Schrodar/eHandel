import './globals.css';
import { TransitionProvider } from '@/components/TransitionProvider';
import { CartProvider } from '@/context/CartProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sv">
      <body>
        <CartProvider>
          <TransitionProvider>
            <div className="flex flex-col min-h-screen">
              {children}
            </div>
          </TransitionProvider>
        </CartProvider>
      </body>
    </html>
  );
}
