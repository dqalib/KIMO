import type { Metadata, Viewport } from "next";
import "@fontsource-variable/nunito";
import "./globals.css";
import SignInGate from "@/components/SignInGate";
import SyncProvider from "@/components/SyncProvider";

export const metadata: Metadata = {
  title: "KIMO",
  description: "Little and often daily practice — times tables, phonics and more.",
  appleWebApp: { capable: true, title: "KIMO", statusBarStyle: "default" },
  // A private family app: keep it out of search engines.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#f6f4ef",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-GB" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <SyncProvider />
        <SignInGate>{children}</SignInGate>
      </body>
    </html>
  );
}
