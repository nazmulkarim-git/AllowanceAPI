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
  metadataBase: new URL("https://forsig.com"),
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-black text-zinc-100 antialiased`}>
        {/* Background: toned down so the UI feels premium (not noisy). */}
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_60%)]" />
          <div className="absolute inset-0 bg-grid opacity-[0.12]" />
          <div className="absolute -left-56 -top-56 h-[520px] w-[520px] rounded-full bg-white/[0.08] blur-3xl" />
          <div className="absolute -bottom-72 -right-72 h-[720px] w-[720px] rounded-full bg-white/[0.08] blur-3xl" />
        </div>
        {children}
      </body>
    </html>
  );
}
