import "./globals.css";

export const metadata = {
  title: "Tee Store",
  description: "En superenkel e-handel (utkast)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="sv">
      <body>{children}</body>
    </html>
  );
}
