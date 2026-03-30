import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import { ToastContainer } from '@/components/ui/toast';

// Self-hosted fonts (no external CDN)
import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/jetbrains-mono';

import './globals.css';

export const metadata: Metadata = {
  title: 'Inspecto — Design Collaboration for Teams',
  description: 'Share, inspect & collaborate on your designs. View-only inspect mode, pixel-perfect measurements, and real-time comments.',
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background font-sans text-foreground antialiased">
        <Providers>
          {children}
          <ToastContainer />
        </Providers>
      </body>
    </html>
  );
}
