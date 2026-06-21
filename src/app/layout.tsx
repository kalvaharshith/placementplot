import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PlacementPlot AI — Your AI-Powered Placement Assistant",
  description:
    "Get placement-ready with AI-powered resume scoring, mock interviews, company-specific preparation, and personalized roadmaps. Built for Indian engineering students.",
  keywords: [
    "placement preparation",
    "ATS resume score",
    "mock interview AI",
    "campus placement",
    "engineering jobs India",
    "TCS interview questions",
    "Infosys placement",
    "CBIT placements",
    "resume analyzer",
    "placement roadmap",
  ],
  authors: [{ name: "PlacementPlot AI" }],
  openGraph: {
    title: "PlacementPlot AI — Your AI-Powered Placement Assistant",
    description:
      "Get placement-ready with AI-powered resume scoring, mock interviews, and personalized roadmaps.",
    type: "website",
    locale: "en_IN",
    siteName: "PlacementPlot AI",
  },
  twitter: {
    card: "summary_large_image",
    title: "PlacementPlot AI",
    description:
      "AI-powered placement preparation for engineering students.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-[family-name:var(--font-inter)]">
        {children}
      </body>
    </html>
  );
}
