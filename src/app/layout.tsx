import type { Metadata, Viewport } from "next";
import "@fontsource-variable/nunito";
import "./globals.css";
import SyncProvider from "@/components/SyncProvider";

export const metadata: Metadata = {
  title: "KIMO",
  description: "Little and often daily practice — times tables, phonics and more.",
  appleWebApp: { capable: true, title: "KIMO", statusBarStyle: "default" },
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
        {children}
      </body>
    </html>
  );
}
