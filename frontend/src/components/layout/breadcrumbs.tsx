'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// Segment → i18n key on the `dashboard.breadcrumb` namespace. Unknown
// segments fall through to the title-cased literal.
const LABEL_KEYS: Record<string, string> = {
  dashboard: 'dashboard.breadcrumb.dashboard',
  evaluation: 'dashboard.breadcrumb.evaluation',
  upload: 'dashboard.breadcrumb.upload',
  results: 'dashboard.breadcrumb.results',
  schemes: 'dashboard.breadcrumb.schemes',
  settings: 'dashboard.breadcrumb.settings',
  'sign-in': 'dashboard.breadcrumb.signIn',
  'sign-up': 'dashboard.breadcrumb.signUp'
}

export function Breadcrumbs() {
  const { t } = useTranslation()
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  function toLabel(segment: string, index: number): string {
    if (LABEL_KEYS[segment]) return t(LABEL_KEYS[segment])
    // Dynamic Firestore IDs land under `/results/{id}` — too long to render raw.
    // Show first 6 chars + ellipsis so the breadcrumb stays scannable.
    const previous = segments[index - 1]
    if (previous === 'results' && segment.length > 12) {
      return `${segment.slice(0, 6)}…`
    }
    return segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  if (segments.length === 0) return null

  const crumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    return {
      label: toLabel(segment, index),
      href,
      isLast: index === segments.length - 1
    }
  })

  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 md:flex">
      {crumbs.map((crumb, i) => (
        <div key={crumb.href} className="flex min-w-0 items-center gap-1.5">
          {i > 0 && <ChevronRight className="size-3 shrink-0 text-muted-foreground/50" aria-hidden />}
          {crumb.isLast ? (
            <span className="truncate text-sm font-medium text-foreground" aria-current="page">
              {crumb.label}
            </span>
          ) : (
            <Link
              href={crumb.href}
              className="truncate text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {crumb.label}
            </Link>
          )}
        </div>
      ))}
    </nav>
  )
}
