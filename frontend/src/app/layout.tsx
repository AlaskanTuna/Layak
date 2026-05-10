import type { Metadata } from 'next'
import { Abril_Fatface, Geist, Literata } from 'next/font/google'

import { AuthProvider } from '@/lib/auth-context'
import { I18nProvider } from '@/providers/i18n-provider'
import { LanguageSync } from '@/providers/language-sync'
import { ThemeProvider } from '@/providers/theme-provider'

import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
  display: 'swap'
})

const literata = Literata({
  variable: '--font-literata',
  subsets: ['latin'],
  display: 'swap'
})

const abrilFatface = Abril_Fatface({
  variable: '--font-abril-fatface',
  subsets: ['latin'],
  weight: '400',
  display: 'swap'
})

export const metadata: Metadata = {
  metadataBase: new URL('https://layak.tech'),
  title: 'Layak',
  description:
    'Agentic AI concierge for Malaysian social-assistance schemes. Draft packet only — never submits on your behalf.',
  icons: {
    icon: '/favicon.ico'
  },
  openGraph: {
    type: 'website',
    siteName: 'Layak',
    title: 'Layak — Malaysian social-assistance concierge',
    description:
      'Find the Malaysian social-assistance schemes you qualify for — IC + payslip + bill in, a ranked list out with cited sources and pre-filled draft applications.',
    url: 'https://layak.tech',
    locale: 'en_MY',
    images: [
      {
        url: '/embed-banner.png',
        width: 1672,
        height: 941,
        alt: 'Layak — Agentic AI concierge for Malaysian social-assistance schemes'
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Layak — Malaysian social-assistance concierge',
    description:
      'Find the Malaysian social-assistance schemes you qualify for — IC + payslip + bill in, a ranked list out with cited sources and pre-filled draft applications.',
    images: ['/embed-banner.png']
  }
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${literata.variable} ${abrilFatface.variable} antialiased`}
    >
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <I18nProvider>
            <AuthProvider>
              <LanguageSync>{children}</LanguageSync>
            </AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
