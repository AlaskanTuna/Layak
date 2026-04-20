export function Footer() {
  return (
    <footer className="border-t border-[var(--glass-border)] px-4 py-5 text-xs text-muted-foreground md:px-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p>
          Layak generates <span className="font-medium text-foreground">DRAFT packets only</span> — you submit manually.
        </p>
        <p>Project 2030 · MyAI Future Hackathon · Track 2</p>
      </div>
    </footer>
  )
}
