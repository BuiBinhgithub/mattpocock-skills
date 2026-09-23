import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "../providers/query-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "VaultCore Pro — Management Dashboard",
  description:
    "Enterprise fullstack management console with Next.js 15, NestJS, and HttpOnly JWT Auth.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} dark antialiased`}>
      <body className="min-h-screen bg-[#0B0F17] text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
