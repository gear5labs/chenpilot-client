import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers/Providers";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

export const metadata: Metadata = {
  title: "ChenPilot - AI Co-Pilot for Cross-Chain DeFi",
  description:
    "AI-powered multi-agent system that simplifies how users interact with Bitcoin and Starknet",
  keywords: ["DeFi", "Starknet", "Bitcoin", "AI", "Cross-chain", "Crypto"],
  authors: [{ name: "ChenPilot Team" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={manrope.variable}>
      <body className="font-sans antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
