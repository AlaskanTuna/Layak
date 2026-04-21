'use client'

import { Plus, Trash2 } from 'lucide-react'
import type { ChangeEvent } from 'react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Relationship } from '@/lib/agent-types'

/** Row shape used by the controlled fieldset — `ic_last4` is a raw string so the
 * user's typed-but-incomplete "12" renders without flickering to null. The
 * parent converts empty strings to `null` (or to 4-digit strings) at submit time. */
export type DependantInputRow = {
  relationship: Relationship
  age: number
  ic_last4: string
}

const RELATIONSHIPS: readonly Relationship[] = ['child', 'parent', 'spouse', 'sibling', 'other']

type Props = {
  value: DependantInputRow[]
  onChange: (next: DependantInputRow[]) => void
  disabled?: boolean
  /** Defaults to 15 — matches the backend `ManualEntryPayload.dependants` cap. */
  max?: number
}

export function newEmptyDependant(): DependantInputRow {
  // `age: NaN` renders the input as empty; 0 is a valid age for a newborn
  // dependant so we can't use it as a "not-typed-yet" sentinel without
  // confusing the user into thinking the field was pre-filled.
  return { relationship: 'child', age: Number.NaN, ic_last4: '' }
}

const MAX_AGE = 120

function clampAge(raw: string): number {
  if (raw === '') return Number.NaN
  const n = Number(raw)
  if (Number.isNaN(n)) return Number.NaN
  return Math.min(MAX_AGE, Math.max(0, Math.floor(n)))
}

/** Shared controlled component — used by UploadWidget (hybrid path) and
 * ManualEntryForm (full manual path). Stays dumb on purpose so each parent
 * manages its own validation/coercion. */
export function DependantsFieldset({ value, onChange, disabled = false, max = 15 }: Props) {
  const update = (i: number, patch: Partial<DependantInputRow>) =>
    onChange(value.map((row, j) => (j === i ? { ...row, ...patch } : row)))
  const append = () => onChange([...value, newEmptyDependant()])
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i))

  const count = value.length
  const householdSize = 1 + count

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        Add everyone else who shares your household. Children under 18 and parents aged 60+ unlock
        specific schemes. Household size: {householdSize} (you + {count} dependant{count === 1 ? '' : 's'}).
      </p>
      {count === 0 && (
        <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
          No dependants yet. Click &ldquo;Add dependant&rdquo; to list each household member.
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {value.map((row, index) => (
          <li
            key={index}
            className="grid gap-2 rounded-md border border-border px-3 py-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`dep-rel-${index}`}>Relationship</Label>
              <select
                id={`dep-rel-${index}`}
                disabled={disabled}
                value={row.relationship}
                onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                  update(index, { relationship: e.target.value as Relationship })
                }
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {RELATIONSHIPS.map(r => (
                  // Explicit bg/text on <option> — the native dropdown popup
                  // ignores the select's bg and defaults to white, which makes
                  // text invisible in dark mode.
                  <option key={r} value={r} className="bg-popover text-popover-foreground">
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`dep-age-${index}`}>Age</Label>
              <Input
                id={`dep-age-${index}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_AGE}
                disabled={disabled}
                placeholder="Age"
                value={Number.isFinite(row.age) ? row.age : ''}
                onChange={e => update(index, { age: clampAge(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`dep-ic-${index}`}>IC last 4 (optional)</Label>
              <Input
                id={`dep-ic-${index}`}
                inputMode="numeric"
                maxLength={4}
                disabled={disabled}
                value={row.ic_last4}
                onChange={e => update(index, { ic_last4: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove dependant ${index + 1}`}
                disabled={disabled}
                onClick={() => remove(index)}
              >
                <Trash2 className="size-4" aria-hidden />
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || count >= max}
        onClick={append}
        className="w-fit gap-1.5"
      >
        <Plus className="size-4" aria-hidden />
        Add dependant
      </Button>
    </div>
  )
}
