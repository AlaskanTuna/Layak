import { Sparkles } from 'lucide-react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function DemoModeBanner() {
  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
      <Sparkles className="size-4" aria-hidden />
      <AlertTitle>DEMO MODE</AlertTitle>
      <AlertDescription className="text-amber-800 dark:text-amber-200">
        Running against Aisyah — a synthetic Grab driver in Kuantan, two school-age children and one elderly dependant.
        No real MyKad is involved.
      </AlertDescription>
    </Alert>
  )
}
