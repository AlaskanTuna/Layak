import type { Metadata } from 'next'
import { Geist, Newsreader } from 'next/font/google'

import { AuthProvider } from '@/lib/auth-context'
import { I18nProvider } from '@/providers/i18n-provider'
import { ThemeProvider } from '@/providers/theme-provider'

import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin']
})

const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
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
      className={`${geistSans.variable} ${newsreader.variable} antialiased`}
    >
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <I18nProvider>
            <AuthProvider>{children}</AuthProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
