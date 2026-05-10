'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  showSummary?: boolean
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
export function DependantsFieldset({ value, onChange, disabled = false, max = 15, showSummary = true }: Props) {
  const { t } = useTranslation()
  const update = (i: number, patch: Partial<DependantInputRow>) =>
    onChange(value.map((row, j) => (j === i ? { ...row, ...patch } : row)))
  const append = () => onChange([...value, newEmptyDependant()])
  const remove = (i: number) => onChange(value.filter((_, j) => j !== i))

  const count = value.length
  const householdSize = 1 + count
  const pluralLabel =
    count === 1 ? t('evaluation.dependants.dependantSingular') : t('evaluation.dependants.dependantPlural')

  return (
    <div className="flex flex-col gap-3">
      {showSummary && (
        <p className="text-xs text-muted-foreground">
          {t('evaluation.dependants.description', { size: householdSize, count, plural: pluralLabel })}
        </p>
      )}
      {count === 0 && (
        <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
          {t('evaluation.dependants.empty')}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {value.map((row, index) => (
          <li
            key={index}
            className="grid gap-2 rounded-md border border-border px-3 py-3 sm:grid-cols-[1fr_1fr_1fr_auto]"
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`dep-rel-${index}`}>{t('evaluation.dependants.relationship')}</Label>
              <Select
                value={row.relationship}
                onValueChange={(next: unknown) => update(index, { relationship: next as Relationship })}
                disabled={disabled}
              >
                <SelectTrigger id={`dep-rel-${index}`}>
                  <SelectValue>{t(`evaluation.dependants.relationships.${row.relationship}`)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {t(`evaluation.dependants.relationships.${r}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`dep-age-${index}`}>{t('evaluation.dependants.age')}</Label>
              <Input
                id={`dep-age-${index}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_AGE}
                disabled={disabled}
                placeholder={t('evaluation.dependants.agePlaceholder')}
                value={Number.isFinite(row.age) ? row.age : ''}
                onChange={(e) => update(index, { age: clampAge(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`dep-ic-${index}`}>{t('evaluation.dependants.icOptional')}</Label>
              <Input
                id={`dep-ic-${index}`}
                inputMode="numeric"
                maxLength={4}
                disabled={disabled}
                value={row.ic_last4}
                onChange={(e) => update(index, { ic_last4: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('evaluation.dependants.removeAria', { index: index + 1 })}
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
        {t('evaluation.dependants.add')}
      </Button>
    </div>
  )
}
