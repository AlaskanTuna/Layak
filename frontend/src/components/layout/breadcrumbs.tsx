'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronRight } from 'lucide-react'

const LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  evaluation: 'Evaluation',
  upload: 'Upload',
  results: 'Results',
  schemes: 'Schemes',
  settings: 'Settings',
  'sign-in': 'Sign in',
  'sign-up': 'Sign up'
}

function toLabel(segment: string): string {
  if (LABELS[segment]) return LABELS[segment]
  return segment.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  const crumbs = segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/')
    return {
      label: toLabel(segment),
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
