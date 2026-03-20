import type { Metadata } from "next";
import { Inter, Barlow_Condensed, JetBrains_Mono, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-display",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono-alt",
});

export const metadata: Metadata = {
  title: {
    default: "Stackteryx",
    template: "%s — Stackteryx",
  },
  description:
    "The pricing, margin, and enablement engine for profitable MSP security offerings.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" },
    ],
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${barlowCondensed.variable} ${jetbrainsMono.variable} ${ibmPlexMono.variable} ${inter.className}`}
      >
        {children}
        <Analytics />
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
