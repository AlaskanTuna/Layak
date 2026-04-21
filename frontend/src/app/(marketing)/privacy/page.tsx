import type { Metadata } from 'next'

import { PrivacyContent } from '@/components/marketing/privacy-content'

export const metadata: Metadata = {
  title: 'Privacy Notice — Layak',
  description:
    "How Layak handles your personal data under Malaysia's Personal Data Protection Act 2010 (PDPA)."
}

export default function PrivacyPage() {
  return <PrivacyContent />
}
