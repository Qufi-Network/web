import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/sora';
import '@fontsource-variable/jetbrains-mono';
import './globals.css';
import './descent.css';
import './surfaces.css';
import './economy.css';

/**
 * Fonts are self-hosted rather than fetched from a font CDN: the opening beat is
 * a single point on a black screen, and a blocking request to somebody else's
 * origin is not something that beat can afford.
 */

export const metadata: Metadata = {
  metadataBase: new URL('https://qufi.network'),
  title: {
    default: 'QUFI Network — post-quantum verification and settlement',
    template: '%s — QUFI Network',
  },
  description:
    'QUFI is a post-quantum verification network for money. Independent nodes check every mint, transfer, approval and redemption using post-quantum cryptography, then settle the result.',
  applicationName: 'QUFI Network',
  openGraph: {
    type: 'website',
    siteName: 'QUFI Network',
    title: 'QUFI Network — post-quantum verification and settlement',
    description:
      'Independent nodes check every mint, transfer, approval and redemption using post-quantum cryptography, then settle the result.',
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#04060B',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  // The scene is the interaction surface; a pinch on it should not zoom the
  // document out from under it.
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body>{children}</body>
    </html>
  );
}
