import { PageHeading } from '@/components/layout/page-heading'
import { SettingsPlaceholder } from '@/components/settings/settings-placeholder'

export default function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <PageHeading
        eyebrow="Settings"
        title="Your defaults and preferences."
        description="Most controls land in v2 — for now the page is a placeholder."
      />
      <SettingsPlaceholder />
    </div>
  )
}
