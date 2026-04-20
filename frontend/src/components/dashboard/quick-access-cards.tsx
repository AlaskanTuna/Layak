import Link from 'next/link'
import { ArrowRight, BookOpen, Library, Settings, Sparkles, type LucideIcon } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Shortcut = {
  title: string
  description: string
  href: string
  icon: LucideIcon
  primary?: boolean
}

const SHORTCUTS: Shortcut[] = [
  {
    title: 'Start an evaluation',
    description: 'Upload MyKad, payslip, and a utility bill. See the five-step agent pipeline run.',
    href: '/dashboard/evaluation',
    icon: Sparkles,
    primary: true
  },
  {
    title: 'Browse schemes',
    description: 'The scheme corpus covered in this build — STR 2026, JKM Warga Emas, LHDN Form B reliefs.',
    href: '/dashboard/schemes',
    icon: Library
  },
  {
    title: 'How it works',
    description: 'A plain-English walkthrough of the pipeline and the disclaimers behind every DRAFT.',
    href: '/dashboard/how-it-works',
    icon: BookOpen
  },
  {
    title: 'Settings',
    description: 'Language, defaults, data handling — placeholder for the v2 settings surface.',
    href: '/settings',
    icon: Settings
  }
]

export function QuickAccessCards() {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {SHORTCUTS.map(shortcut => {
        const Icon = shortcut.icon
        return (
          <Link key={shortcut.href} href={shortcut.href} className="group" aria-label={shortcut.title}>
            <Card
              className={
                shortcut.primary
                  ? 'h-full border-primary/30 bg-primary/5 transition-colors group-hover:bg-primary/10'
                  : 'h-full transition-colors group-hover:bg-accent/40'
              }
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-4" aria-hidden />
                  </div>
                  <ArrowRight
                    className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </div>
                <CardTitle className="font-heading text-base">{shortcut.title}</CardTitle>
                <CardDescription className="text-xs leading-relaxed">{shortcut.description}</CardDescription>
              </CardHeader>
              <CardContent />
            </Card>
          </Link>
        )
      })}
    </section>
  )
}
