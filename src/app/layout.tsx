import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { NativeInit } from "@/components/native-init";
import { SplashScreen } from "@/components/splash-screen";
import { ThemeProvider } from "@/components/theme-provider";
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
  viewportFit: 'cover',
  themeColor: '#313030',
};

export const metadata: Metadata = {
  title: "plustrust | source for music news",
  description: "Your source for hip hop, R&B, and soul music news.",
  keywords: ["music news", "hip hop", "R&B", "soul", "rap", "music"],
  authors: [{ name: "plustrust" }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'plustrust',
    startupImage: '/icons/appstoreicon.png',
  },
  openGraph: {
    title: "plustrust",
    description: "Your source for hip hop, R&B, and soul music news",
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

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://plusntrust.org/#organization',
      name: 'plustrust',
      url: 'https://plusntrust.org',
      logo: {
        '@type': 'ImageObject',
        url: 'https://plusntrust.org/icons/icon-512.png',
      },
      description:
        'Your source for hip hop, R&B, and soul music news.',
      sameAs: [],
    },
    {
      '@type': 'WebSite',
      '@id': 'https://plusntrust.org/#website',
      url: 'https://plusntrust.org',
      name: 'plustrust',
      publisher: { '@id': 'https://plusntrust.org/#organization' },
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://plusntrust.org/search?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('theme');document.documentElement.setAttribute('data-theme',t||'dark')}catch(e){document.documentElement.setAttribute('data-theme','dark')}})()` }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider>
          <NativeInit />
          <SplashScreen />
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
