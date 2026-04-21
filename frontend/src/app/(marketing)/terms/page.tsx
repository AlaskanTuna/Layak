import type { Metadata } from 'next'

import { TermsContent } from '@/components/marketing/terms-content'

export const metadata: Metadata = {
  title: 'Terms of Use — Layak',
  description:
    'The terms under which Layak, a hackathon demonstration system for Malaysian social-assistance schemes, is provided.'
}

export default function TermsPage() {
  return <TermsContent />
}
