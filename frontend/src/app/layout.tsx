import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./auth-page.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "VakilSuite — Prayagraj High Court",
  description: "Case management for Allahabad HC lawyers",
};

import { ToastProvider } from "@/components/shared/ToastProvider";

import { GoogleProvider } from "@/components/shared/GoogleProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body suppressHydrationWarning className="antialiased">
        <ToastProvider><GoogleProvider>{children}</GoogleProvider></ToastProvider>
      </body>
    </html>
  );
}
