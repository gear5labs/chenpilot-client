import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Chenpilot Client',
  description: 'Chenpilot PWA Client',
  manifest: '/manifest.webmanifest',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
