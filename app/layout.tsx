import '@/styles/globals.css';
import { Metadata, Viewport } from 'next';
import { ReactNode } from 'react';
import clsx from 'clsx';

import { Providers } from './providers';

import { siteConfig } from '@/config/site';
import { fontSans } from '@/config/fonts';
import { Navbar } from '@/components/navbar';

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html suppressHydrationWarning lang="pt-BR">
      <head>
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        <meta content="noindex, nofollow" name="robots" />
        <meta
          content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.trello.com https://*.supabase.co; font-src 'self' data:;"
          httpEquiv="Content-Security-Policy"
        />
      </head>
      <body
        className={clsx(
          'min-h-screen text-foreground bg-background font-sans antialiased',
          fontSans.variable
        )}
      >
        <Providers themeProps={{ attribute: 'class', defaultTheme: 'dark' }}>
          <div className="relative flex flex-col min-h-screen">
            <Navbar />
            <main className="container mx-auto max-w-full pt-16 px-4 sm:px-6 lg:px-8 flex-grow">
              {children}
            </main>
            <footer className="w-full flex items-center justify-center py-4 px-4 border-t border-divider bg-background/80 backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row items-center gap-2 text-current text-center">
                <span className="text-default-600">© 2024</span>
                <span className="text-primary font-semibold">
                  inChurch - Time de Suporte
                </span>
                <span className="text-default-500 text-sm">v1.0.0</span>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
