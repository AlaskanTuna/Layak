import Link from 'next/link'

export function Footer() {
  return (
    <footer className="border-t border-[var(--glass-border)] px-4 py-4 text-xs text-muted-foreground md:px-6">
      <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1">
        <span>© 2026 Layak</span>
        <span aria-hidden className="opacity-40">
          ·
        </span>
        <Link href="/" className="transition-colors hover:text-foreground">
          Contact Us
        </Link>
        <span aria-hidden className="opacity-40">
          ·
        </span>
        <Link href="/dashboard/how-it-works" className="transition-colors hover:text-foreground">
          How it Works
        </Link>
      </div>
    </footer>
  )
}
