import type { Metadata, Viewport } from 'next';
import { Inter, Instrument_Serif, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { SiteNav } from '@/components/site-nav';
import { SiteFooter } from '@/components/site-footer';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-serif',
  display: 'swap',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sachncs.github.io';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const repoUrl = 'https://github.com/sachncs/fleetpilot';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'FleetPilot — Route optimization for modern logistics',
    template: '%s · FleetPilot',
  },
  description:
    'FleetPilot solves resource-constrained pickup-and-delivery with a two-stage metaheuristic. Built for fleets that need answers, not paper parity.',
  applicationName: 'FleetPilot',
  authors: [{ name: 'Sachin', url: repoUrl }],
  generator: 'Next.js',
  keywords: [
    'route optimization',
    'pickup and delivery',
    'vehicle routing',
    'ALNS',
    'BRKGA',
    'metaheuristic',
    'logistics',
    'last-mile',
    'fleetpilot',
  ],
  referrer: 'origin-when-cross-origin',
  creator: 'Sachin',
  publisher: 'FleetPilot',
  alternates: {
    canonical: `${basePath}/`,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: `${siteUrl}${basePath}/`,
    siteName: 'FleetPilot',
    title: 'FleetPilot — Route optimization for modern logistics',
    description:
      'Two-stage metaheuristic (ALNS + BRKGA) for resource-constrained pickup-and-delivery. Production-grade, fast, deterministic.',
    images: [
      {
        url: `${siteUrl}${basePath}/og.png`,
        width: 1280,
        height: 640,
        alt: 'FleetPilot — Route optimization for modern logistics',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FleetPilot — Route optimization for modern logistics',
    description:
      'Two-stage metaheuristic (ALNS + BRKGA) for resource-constrained pickup-and-delivery.',
    images: [`${siteUrl}${basePath}/og.png`],
    creator: '@sachncs',
  },
  icons: {
    icon: `${basePath}/favicon.svg`,
    shortcut: `${basePath}/favicon.svg`,
    apple: `${basePath}/favicon.svg`,
  },
  manifest: `${basePath}/manifest.json`,
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  category: 'technology',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfbfd' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0d12' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${serif.variable} ${mono.variable}`}
    >
      <body className="antialiased">
        <ThemeProvider>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-full focus:bg-[var(--fg)] focus:px-4 focus:py-2 focus:text-[var(--bg)]"
          >
            Skip to content
          </a>
          <SiteNav />
          <main id="main">{children}</main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}