import "../styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AllowanceAPI Dashboard",
  description: "Financial firewall for AI agents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
