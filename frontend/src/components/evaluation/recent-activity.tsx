type ActivityItem = {
  id: string
  when: string
  title: string
  description: string
}

const MOCK_ACTIVITY: ActivityItem[] = [
  {
    id: 'lhdn-analyzed',
    when: 'Today · 09:41 AM',
    title: 'LHDN eA form analysed',
    description: 'Layak identified 2 potential new tax reliefs based on your recent upload.'
  },
  {
    id: 'doc-uploaded',
    when: 'Yesterday',
    title: 'Document uploaded',
    description: 'eA_Form_2025.pdf added to your document vault.'
  },
  {
    id: 'str-submitted',
    when: '12 Sep 2025',
    title: 'STR application submitted',
    description: 'Application sent via Layak portal integration.'
  }
]

export function RecentActivity() {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-lg font-semibold tracking-tight">Recent Activity</h2>
      <ol className="flex flex-col gap-4">
        {MOCK_ACTIVITY.map(item => (
          <li key={item.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden />
              <span className="h-full w-px grow bg-border" aria-hidden />
            </div>
            <div className="flex flex-col gap-0.5 pb-2">
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{item.when}</p>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs leading-relaxed text-muted-foreground">{item.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
