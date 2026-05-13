'use client'

import { Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Relationship } from '@/lib/agent-types'

/** Row shape used by the controlled fieldset. Phase 12: dependant IC field
 * dropped — none of the rules read it for eligibility, and the manual-entry
 * path now collects no IC information of any kind. */
export type DependantInputRow = {
  relationship: Relationship
  age: number
  monthly_income_rm: string
}

const RELATIONSHIPS: readonly Relationship[] = ['child', 'parent', 'spouse', 'sibling', 'grandparent', 'other']

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
  return { relationship: 'child', age: Number.NaN, monthly_income_rm: '' }
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
  const spouseCount = value.filter((row) => row.relationship === 'spouse').length
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
            className="grid gap-2 rounded-md border border-border px-3 py-3 sm:grid-cols-[1fr_0.75fr_1fr_auto]"
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
                onChange={(e) => {
                  const nextAge = clampAge(e.target.value)
                  update(index, {
                    age: nextAge,
                    ...(Number.isFinite(nextAge) && nextAge < 18 ? { monthly_income_rm: '' } : {})
                  })
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={`dep-income-${index}`}>{t('evaluation.dependants.incomeOptional')}</Label>
              <Input
                id={`dep-income-${index}`}
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                disabled={disabled || !Number.isFinite(row.age) || row.age < 18}
                placeholder={
                  Number.isFinite(row.age) && row.age >= 18
                    ? t('evaluation.dependants.incomePlaceholder')
                    : t('evaluation.dependants.incomeUnder18')
                }
                value={row.monthly_income_rm}
                onChange={(e) => update(index, { monthly_income_rm: e.target.value })}
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
      {spouseCount > 1 && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs leading-relaxed text-foreground/75">
          {t('evaluation.dependants.multiSpouseNote')}
        </p>
      )}
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
