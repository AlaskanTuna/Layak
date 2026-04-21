import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Sora } from 'next/font/google'

import { AuthProvider } from '@/lib/auth-context'
import { I18nProvider } from '@/providers/i18n-provider'
import { ThemeProvider } from '@/providers/theme-provider'

import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta-sans',
  subsets: ['latin']
})

const sora = Sora({
  variable: '--font-sora',
  subsets: ['latin']
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
      className={`${plusJakartaSans.variable} ${sora.variable} antialiased`}
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
