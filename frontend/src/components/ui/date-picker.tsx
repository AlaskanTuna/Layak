'use client'

import * as React from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'

/**
 * Custom lightweight calendar — no date-fns dependency. We only need a
 * month grid for date-of-birth selection, so a vanilla `Date` implementation
 * is leaner than pulling in Base UI's full Calendar primitive (which requires
 * `date-fns@4` + `@date-fns/tz` peer deps).
 */

type Props = {
  /** ISO `YYYY-MM-DD` value. Empty string = unselected. */
  value: string
  onChange: (value: string) => void
  /** Future dates are blocked when set (DOB shouldn't be in the future). */
  disableFuture?: boolean
  /** Earliest selectable year. Defaults to 1900. */
  minYear?: number
  /** Render the trigger button. Receives the formatted display value or null. */
  triggerLabel: React.ReactNode
  /** ARIA label for the trigger button. */
  ariaLabel: string
  disabled?: boolean
  className?: string
}

// English defaults used as fallback if i18n hasn't hydrated yet. The runtime
// labels come from `common.calendar.weekdays` / `common.calendar.months` so a
// ms / zh user sees "Jan / Januari / 一月" without re-mounting the calendar.
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
] as const

function parseISO(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() + 1 !== m || date.getUTCDate() !== d) {
    return null
  }
  return date
}

function toISO(date: Date): string {
  const y = date.getUTCFullYear().toString().padStart(4, '0')
  const m = (date.getUTCMonth() + 1).toString().padStart(2, '0')
  const d = date.getUTCDate().toString().padStart(2, '0')
  return `${y}-${m}-${d}`
}

function todayUTC(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

export function DatePicker({
  value,
  onChange,
  disableFuture = false,
  minYear = 1900,
  triggerLabel,
  ariaLabel,
  disabled = false,
  className
}: Props) {
  const { t } = useTranslation()
  // i18n catalog returns arrays via `returnObjects: true`. Fall back to the
  // English defaults if the runtime catalog is missing (e.g. during initial
  // hydration or an i18n provider mismatch).
  const weekdaysRaw = t('common.calendar.weekdays', {
    returnObjects: true,
    defaultValue: WEEKDAYS_EN as unknown as string[]
  })
  const monthsRaw = t('common.calendar.months', {
    returnObjects: true,
    defaultValue: MONTH_NAMES_EN as unknown as string[]
  })
  const WEEKDAYS = (
    Array.isArray(weekdaysRaw) && weekdaysRaw.length === 7 ? weekdaysRaw : WEEKDAYS_EN
  ) as readonly string[]
  const MONTH_NAMES = (
    Array.isArray(monthsRaw) && monthsRaw.length === 12 ? monthsRaw : MONTH_NAMES_EN
  ) as readonly string[]
  const parsed = parseISO(value)
  const [open, setOpen] = React.useState(false)
  // Visible month — anchored to the selected value if present, else today.
  const [visible, setVisible] = React.useState<Date>(parsed ?? todayUTC())
  // Re-anchor visible month when `value` changes externally (e.g. a
  // sample-data prefill). React's recommended pattern for "derive from prop"
  // is comparing prop to last-seen value during render, not an effect:
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevValue, setPrevValue] = React.useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    if (parsed) setVisible(parsed)
  }

  const today = todayUTC()
  const year = visible.getUTCFullYear()
  const month = visible.getUTCMonth()

  // First day of grid = the Sunday on or before the 1st of the visible month.
  const firstOfMonth = new Date(Date.UTC(year, month, 1))
  const firstWeekday = firstOfMonth.getUTCDay()

  // 6×7 = 42 cells covers any month layout.
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) {
    cells.push(new Date(Date.UTC(year, month, 1 - firstWeekday + i)))
  }

  function shiftMonth(delta: number) {
    setVisible(new Date(Date.UTC(year, month + delta, 1)))
  }
  function shiftYear(delta: number) {
    const nextYear = year + delta
    if (nextYear < minYear) return
    if (disableFuture && nextYear > today.getUTCFullYear()) return
    setVisible(new Date(Date.UTC(nextYear, month, 1)))
  }

  function handleSelect(date: Date) {
    if (disableFuture && date > today) return
    if (date.getUTCFullYear() < minYear) return
    onChange(toISO(date))
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            aria-label={ariaLabel}
            className={className}
          >
            {triggerLabel}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-72 p-3">
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => shiftYear(-1)}
              aria-label={t('common.calendar.aria.prevYear')}
              className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ChevronsLeft className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label={t('common.calendar.aria.prevMonth')}
              className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ChevronLeft className="size-4" aria-hidden />
            </button>
          </div>
          <p className="font-heading text-sm font-semibold tracking-tight">
            {MONTH_NAMES[month]} {year}
          </p>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label={t('common.calendar.aria.nextMonth')}
              className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ChevronRight className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => shiftYear(1)}
              aria-label={t('common.calendar.aria.nextYear')}
              className="inline-flex size-7 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ChevronsRight className="size-4" aria-hidden />
            </button>
          </div>
        </div>

        <div className="mt-2 grid grid-cols-7 gap-0.5">
          {WEEKDAYS.map((d) => (
            <div key={d} className="mono-caption flex h-7 items-center justify-center text-foreground/45" aria-hidden>
              {d.slice(0, 2)}
            </div>
          ))}
          {cells.map((date) => {
            const isOutside = date.getUTCMonth() !== month
            const isSelected = parsed != null && date.getTime() === parsed.getTime()
            const isToday = date.getTime() === today.getTime()
            const isDisabled = (disableFuture && date > today) || date.getUTCFullYear() < minYear
            return (
              <button
                key={toISO(date)}
                type="button"
                disabled={isDisabled}
                onClick={() => handleSelect(date)}
                aria-pressed={isSelected}
                aria-label={`${date.getUTCDate()} ${MONTH_NAMES[date.getUTCMonth()]} ${date.getUTCFullYear()}`}
                className={cn(
                  'inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-sm tabular-nums transition-colors',
                  isOutside && 'text-foreground/30',
                  !isOutside && !isSelected && 'hover:bg-accent hover:text-foreground',
                  isToday && !isSelected && 'ring-1 ring-foreground/20',
                  isSelected &&
                    'bg-[color:var(--hibiscus)] text-[color:var(--hibiscus-foreground)] hover:bg-[color:var(--hibiscus)]/90',
                  isDisabled && 'cursor-not-allowed opacity-40 hover:bg-transparent hover:text-foreground/30'
                )}
              >
                {date.getUTCDate()}
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
