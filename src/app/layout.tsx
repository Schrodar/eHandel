import "./globals.css";
import { TransitionProvider } from "@/components/TransitionProvider";
import { CartProvider } from "@/components/CartProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>
        <CartProvider>
          <TransitionProvider>{children}</TransitionProvider>
        </CartProvider>
      </body>
    </html>
  );
}
