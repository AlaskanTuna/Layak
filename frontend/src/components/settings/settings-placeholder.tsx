import { Construction } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function SettingsPlaceholder() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Construction className="size-4 text-muted-foreground" aria-hidden />
          Settings — v2
        </CardTitle>
        <CardDescription>
          Language, default profile values, data retention, and accessibility knobs will live here. This page is a
          structural placeholder so the route is already wired when the controls land.
        </CardDescription>
      </CardHeader>
      <CardContent />
    </Card>
  )
}
