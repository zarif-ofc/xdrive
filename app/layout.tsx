import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Xdrive — Intelligent Cloud Storage (Google Drive Clone)',
  description: 'Full-stack Google Drive clone powered by Next.js 14, SQLite, and intelligent MEGA & Filen cloud storage routing.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-drive-bg text-drive-text antialiased overflow-hidden min-h-screen`}>
        {children}
      </body>
    </html>
  );
}
