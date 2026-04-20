import { SchemesList } from '@/components/schemes/schemes-list'

export default function SchemesPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Schemes</h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          The Malaysian social-assistance schemes Layak reasons over. Three are in scope for this build; the rest land
          in v2.
        </p>
      </header>
      <SchemesList />
    </div>
  )
}
