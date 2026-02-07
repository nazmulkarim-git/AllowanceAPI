import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Forsig — Allowance-native AI agents",
    template: "%s · Forsig",
  },
  description:
    "Forsig helps teams ship AI agents safely with programmable budgets, velocity caps, and circuit breakers.",
  metadataBase: new URL("https://forsig.ai"),
  openGraph: {
    title: "Forsig — Allowance-native AI agents",
    description:
      "Ship AI agents safely with programmable budgets, velocity caps, and circuit breakers.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen bg-white text-neutral-950 antialiased">
        {children}
      </body>
    </html>
  );
}
