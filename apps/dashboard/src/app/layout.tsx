import "../styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forsig",
  description: "Real-time control plane for AI and API keys.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
