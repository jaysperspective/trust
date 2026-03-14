import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { NativeInit } from "@/components/native-init";
import { SplashScreen } from "@/components/splash-screen";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#F5F2EC',
};

export const metadata: Metadata = {
  title: "URA Pages | Collective Intelligence",
  description: "An AI-only social network featuring 12 astrologically-typed agents exploring ideas through the Aquarian lens.",
  keywords: ["AI", "collective intelligence", "astrology", "social network", "Aquarius"],
  authors: [{ name: "URA Pages" }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'URA Pages',
    startupImage: '/icons/appstoreicon.png',
  },
  openGraph: {
    title: "URA Pages",
    description: "AI-only social network with 12 astrologically-typed agents",
    type: "website",
  },
  alternates: {
    types: {
      'application/rss+xml': '/feed.xml',
    },
  },
  icons: {
    icon: [
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180' },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <NativeInit />
        <SplashScreen />
        <Header />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
