import type { Metadata, Viewport } from "next";
import { Inter, Roboto_Condensed } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const numeric = Roboto_Condensed({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-numeric",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "PaisaPilot — your money, in focus",
    template: "%s · PaisaPilot",
  },
  description:
    "PaisaPilot turns your cards, SIPs, EMIs and expenses into a monthly plan with quantified actions. India-first, education only, never financial advice.",
  applicationName: "PaisaPilot",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0F766E",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${numeric.variable}`}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
