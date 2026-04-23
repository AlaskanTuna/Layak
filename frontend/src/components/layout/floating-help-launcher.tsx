'use client'

import { CircleHelp, FileText, PlayCircle, Sparkles, Waypoints } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type HelpSection = 'overview' | 'documents' | 'samples' | 'results'

const STORAGE_KEY = 'layak.help.section'

function getContextSection(pathname: string | null): HelpSection {
  if (!pathname) return 'overview'
  if (pathname.includes('/evaluation/upload')) return 'documents'
  if (pathname.includes('/evaluation/results')) return 'results'
  return 'overview'
}

export function FloatingHelpLauncher() {
  const pathname = usePathname()
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState<HelpSection>('overview')

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      const contextSection = getContextSection(pathname)
      const stored =
        typeof window === 'undefined' ? null : (window.localStorage.getItem(STORAGE_KEY) as HelpSection | null)
      setSection(contextSection !== 'overview' ? contextSection : stored ?? 'overview')
    }
    setOpen(nextOpen)
  }

  function handleSectionChange(value: string) {
    const next = value as HelpSection
    setSection(next)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next)
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        className="glass-surface fixed right-4 bottom-4 z-40 rounded-full text-foreground shadow-lg hover:bg-accent/25 hover:text-foreground md:right-6 md:bottom-6 dark:hover:bg-accent/35"
        aria-label={t('common.help.open')}
        onClick={() => handleOpenChange(true)}
      >
        <CircleHelp className="size-5" aria-hidden />
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[85svh] max-w-xl overflow-hidden p-0 sm:max-w-2xl">
          <DialogHeader className="px-5 pt-5">
            <DialogTitle>{t('common.help.title')}</DialogTitle>
            <DialogDescription>{t('common.help.description')}</DialogDescription>
          </DialogHeader>
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 pb-5">
            <Tabs value={section} onValueChange={handleSectionChange} className="gap-4">
              {/* `md:grid-cols-2` instead of `-4` so longer non-EN labels
                  ("Apa yang perlu disediakan", "After results") get enough
                  horizontal room; `whitespace-normal text-center leading-tight`
                  overrides the primitive's `whitespace-nowrap` so anything
                  that still doesn't fit wraps in-cell instead of visually
                  bleeding into the next tab. */}
              <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-xl bg-muted/70 p-1">
                <TabsTrigger
                  value="overview"
                  className="h-auto min-h-9 whitespace-normal px-3 py-2 text-center text-xs leading-tight sm:text-sm"
                >
                  {t('common.help.tabs.overview')}
                </TabsTrigger>
                <TabsTrigger
                  value="documents"
                  className="h-auto min-h-9 whitespace-normal px-3 py-2 text-center text-xs leading-tight sm:text-sm"
                >
                  {t('common.help.tabs.documents')}
                </TabsTrigger>
                <TabsTrigger
                  value="samples"
                  className="h-auto min-h-9 whitespace-normal px-3 py-2 text-center text-xs leading-tight sm:text-sm"
                >
                  {t('common.help.tabs.samples')}
                </TabsTrigger>
                <TabsTrigger
                  value="results"
                  className="h-auto min-h-9 whitespace-normal px-3 py-2 text-center text-xs leading-tight sm:text-sm"
                >
                  {t('common.help.tabs.results')}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="mt-0">
                <HelpCard
                  icon={<Waypoints className="size-4" aria-hidden />}
                  title={t('common.help.overview.title')}
                  body={t('common.help.overview.body')}
                  bullets={[
                    t('common.help.overview.point1'),
                    t('common.help.overview.point2'),
                    t('common.help.overview.point3')
                  ]}
                />
              </TabsContent>
              <TabsContent value="documents" className="mt-0">
                <HelpCard
                  icon={<FileText className="size-4" aria-hidden />}
                  title={t('common.help.documents.title')}
                  body={t('common.help.documents.body')}
                  bullets={[
                    t('common.help.documents.point1'),
                    t('common.help.documents.point2'),
                    t('common.help.documents.point3')
                  ]}
                />
              </TabsContent>
              <TabsContent value="samples" className="mt-0">
                <HelpCard
                  icon={<Sparkles className="size-4" aria-hidden />}
                  title={t('common.help.samples.title')}
                  body={t('common.help.samples.body')}
                  bullets={[
                    t('common.help.samples.point1'),
                    t('common.help.samples.point2'),
                    t('common.help.samples.point3')
                  ]}
                />
              </TabsContent>
              <TabsContent value="results" className="mt-0">
                <HelpCard
                  icon={<PlayCircle className="size-4" aria-hidden />}
                  title={t('common.help.results.title')}
                  body={t('common.help.results.body')}
                  bullets={[
                    t('common.help.results.point1'),
                    t('common.help.results.point2'),
                    t('common.help.results.point3')
                  ]}
                />
              </TabsContent>
            </Tabs>
            <div className="flex items-center justify-between rounded-xl border border-border/80 bg-muted/40 px-4 py-3">
              <p className="pr-3 text-xs text-muted-foreground">{t('common.help.footer')}</p>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {t('common.button.done')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

function HelpCard({
  icon,
  title,
  body,
  bullets
}: {
  icon: React.ReactNode
  title: string
  body: string
  bullets: string[]
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">{icon}</div>
        <h3 className="font-heading text-base font-semibold tracking-tight">{title}</h3>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {bullets.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
