import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/sora';
import '@fontsource-variable/jetbrains-mono';
import './globals.css';
import './network.css';
import './document.css';
import './lifecycle.css';
// Last, so what is only true on a phone wins over what is true everywhere.
import './mobile.css';

/**
 * Fonts are self-hosted rather than fetched from a font CDN: the opening beat is
 * a single point on a black screen, and a blocking request to somebody else's
 * origin is not something that beat can afford.
 */

export const metadata: Metadata = {
  metadataBase: new URL('https://qufi.network'),
  title: {
    default: 'QuFi — the verification layer for the post-quantum economy',
    template: '%s — QuFi Network',
  },
  description:
    'QuFi is an independent verification layer beneath high-value digital settlement. Post-quantum signing, proof generation off the settlement path, collateral confirmation, proof-gated movement and recovery pathways, across multiple settlement environments.',
  applicationName: 'QUFI Network',
  openGraph: {
    type: 'website',
    siteName: 'QuFi Network',
    title: 'QuFi — the verification layer for the post-quantum economy',
    description:
      'An independent verification layer between action and settlement. Verify before value moves.',
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
