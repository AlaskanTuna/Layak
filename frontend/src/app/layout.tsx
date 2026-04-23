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
  title: 'Layak',
  description:
    'Agentic AI concierge for Malaysian social-assistance schemes. Draft packet only — never submits on your behalf.',
  icons: {
    icon: '/favicon.ico'
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
