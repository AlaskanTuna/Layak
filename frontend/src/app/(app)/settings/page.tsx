import { SettingsPlaceholder } from '@/components/settings/settings-placeholder'

export default function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">Settings</h1>
        <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
          Your defaults and preferences. Most controls land in v2 — for now the page is a placeholder.
        </p>
      </header>
      <SettingsPlaceholder />
    </div>
  )
}
