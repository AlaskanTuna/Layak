'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, Eraser } from 'lucide-react'
import { useImperativeHandle, useMemo } from 'react'
import { Controller, type SubmitHandler, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { DependantsFieldset, type DependantInputRow } from '@/components/evaluation/dependants-fieldset'
import { SectionBadge } from '@/components/evaluation/section-badge'
import { Button } from '@/components/ui/button'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { ManualEntryPayload, Relationship } from '@/lib/agent-types'

// Editorial paper surface for form sections — replaces the legacy shadcn Card
// shell with the design system's `paper-card`. `overflow-visible` is required
// so the InfoTooltip pop-out clears the card edge.
const SECTION_CLASS =
  'paper-card flex min-h-[180px] flex-col gap-5 overflow-visible rounded-[14px] p-5 sm:p-6'

const RELATIONSHIPS = ['child', 'parent', 'spouse', 'sibling', 'other'] as const satisfies readonly Relationship[]

/** Strip every non-digit char and cap at 12 so users can paste a dashed
 * IC (`920324-06-4321`) and we still feed the backend a clean 12-digit
 * string. Pydantic's `^\d{12}$` rejects dashes outright. */
function formatIcMask(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 12)
}

type FormValues = {
  name: string
  ic: string
  monthly_income_rm: number
  employment_type: 'gig' | 'salaried'
  address: string
  monthly_cost_rm: string
  monthly_kwh: string
  dependants: DependantInputRow[]
}

/**
 * Aisyah defaults for one-click pre-fill (parity with upload-path samples).
 * IC `920324064321` — YYMMDD 920324 → DOB 1992-03-24 (age 34 against any
 * 2026 reference after 24 Mar), PB 06 (Pahang), serial 4321.
 */
const AISYAH_DEFAULTS: FormValues = {
  name: 'Aisyah binti Ahmad',
  ic: '920324064321',
  monthly_income_rm: 2800,
  employment_type: 'gig',
  address: 'No. 42, Jalan IM 7/10, Bandar Indera Mahkota, 25200 Kuantan, Pahang',
  monthly_cost_rm: '95.40',
  monthly_kwh: '220',
  dependants: [
    { relationship: 'child', age: 10, ic_last6: '' },
    { relationship: 'child', age: 7, ic_last6: '' },
    { relationship: 'parent', age: 70, ic_last6: '' }
  ]
}

/**
 * Farhan defaults for one-click pre-fill — salaried-teacher counterpart to
 * Aisyah. Mirrors `frontend/src/lib/farhan-fixtures.ts` dependants so the
 * manual and upload paths produce equivalent profiles. IC `880322065837`
 * → DOB 1988-03-22 (age 38 against any 2026 reference after 22 Mar), PB
 * 06, serial 5837. Gross monthly income is RM 4,180.50 (basic + allowances).
 */
const FARHAN_DEFAULTS: FormValues = {
  name: 'Cikgu Farhan bin Mohd Yusof',
  ic: '880322065837',
  monthly_income_rm: 4180.5,
  employment_type: 'salaried',
  address: 'No. 24, Jalan Putera 3/2, Taman Putera Subang, 47600 Subang Jaya, Selangor',
  monthly_cost_rm: '152.40',
  monthly_kwh: '380',
  dependants: [
    { relationship: 'spouse', age: 36, ic_last6: '' },
    { relationship: 'child', age: 10, ic_last6: '' },
    { relationship: 'child', age: 7, ic_last6: '' }
  ]
}

export type ManualSamplePersona = 'aisyah' | 'farhan'

/** Imperative handle exposed by `ManualEntryForm` so a parent (the upload
 * page header dropdown) can prefill the form with one of the sample personas
 * without re-rendering or duplicating the defaults. */
export type ManualEntryFormHandle = {
  applySample: (persona: ManualSamplePersona) => void
}

const EMPTY_DEFAULTS: FormValues = {
  name: '',
  ic: '',
  monthly_income_rm: 0,
  employment_type: 'gig',
  address: '',
  monthly_cost_rm: '',
  monthly_kwh: '',
  dependants: []
}

type Props = {
  onSubmit: (payload: ManualEntryPayload) => void
  onUseSamples: (persona: ManualSamplePersona) => void
  /** Fires after the form is reset to its empty defaults via the Clear button. */
  onClear?: () => void
  disabled?: boolean
  /** Optional id applied to the submit button — used by the help tour to anchor a step on it. */
  submitId?: string
  /** Imperative handle for parent-initiated sample prefill (React 19 ref-as-prop). */
  ref?: React.Ref<ManualEntryFormHandle>
}

export function ManualEntryForm({ onSubmit, onUseSamples, onClear, disabled = false, submitId, ref }: Props) {
  const { t } = useTranslation()

  // Zod schema is built inside the component so refinement messages can call `t()`.
  // `useMemo` keeps the reference stable across renders for the same language;
  // the `t` dependency re-builds after a language switch so existing error
  // messages pick up the new locale on the next validation pass.
  const manualEntrySchema = useMemo(() => {
    const dependantSchema = z.object({
      relationship: z.enum(RELATIONSHIPS),
      age: z.number().int().min(0).max(120),
      ic_last6: z
        .string()
        .refine((v) => v === '' || /^\d{6}$/.test(v), { message: t('evaluation.manual.zodIc6Digits') })
    })

    return z.object({
      name: z.string().trim().min(1, t('evaluation.manual.zodRequired')).max(200),
      ic: z
        .string()
        .regex(/^\d{12}$/, t('evaluation.manual.zodIcDigits'))
        .superRefine((v, ctx) => {
          // Sanity-check the YYMMDD prefix here so the user sees the error
          // inline rather than waiting for a 422 from the backend.
          const mm = Number(v.slice(2, 4))
          const dd = Number(v.slice(4, 6))
          if (mm < 1 || mm > 12 || dd < 1 || dd > 31) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: t('evaluation.manual.zodIcNotRealDate') })
          }
        }),
      monthly_income_rm: z.number().min(0).max(1_000_000),
      employment_type: z.enum(['gig', 'salaried']),
      address: z.string().max(300),
      monthly_cost_rm: z.string().refine((v) => v === '' || (/^\d+(\.\d{1,2})?$/.test(v) && Number(v) <= 100000), {
        message: t('evaluation.manual.zodCostFormat')
      }),
      monthly_kwh: z.string().refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) <= 10000), {
        message: t('evaluation.manual.zodKwhFormat')
      }),
      dependants: z.array(dependantSchema).max(15)
    })
  }, [t])

  const form = useForm<FormValues>({
    resolver: zodResolver(manualEntrySchema),
    defaultValues: EMPTY_DEFAULTS,
    mode: 'onBlur'
  })
  const { register, handleSubmit, control, formState, reset } = form
  // `useWatch` is the memo-safe alternative to `form.watch()` — the React Compiler
  // plugin flags `watch()` because it can't reliably cache its result.
  const watchedDependants = (useWatch({ control, name: 'dependants' }) ?? []) as DependantInputRow[]

  const submit: SubmitHandler<FormValues> = (values) => {
    const payload: ManualEntryPayload = {
      name: values.name.trim(),
      ic: values.ic,
      monthly_income_rm: values.monthly_income_rm,
      employment_type: values.employment_type,
      address: values.address.trim().length > 0 ? values.address.trim() : null,
      monthly_cost_rm: values.monthly_cost_rm === '' ? null : Number(values.monthly_cost_rm),
      monthly_kwh: values.monthly_kwh === '' ? null : Number(values.monthly_kwh),
      dependants: values.dependants.map((d) => ({
        relationship: d.relationship,
        age: d.age,
        ic_last6: d.ic_last6 === '' ? null : d.ic_last6
      }))
    }
    onSubmit(payload)
  }

  // Expose `applySample` to the parent so the unified header dropdown can
  // prefill this form when on the Manual tab. React 19 supports passing the
  // ref as a regular prop — no `forwardRef` wrapper needed. Inlined here
  // (rather than reusing a separate `handleUseSample`) so the deps array
  // doesn't churn on every render.
  useImperativeHandle(
    ref,
    () => ({
      applySample: (persona: ManualSamplePersona) => {
        reset(persona === 'aisyah' ? AISYAH_DEFAULTS : FARHAN_DEFAULTS)
        onUseSamples(persona)
      }
    }),
    [reset, onUseSamples]
  )

  const handleClearInline = () => {
    reset(EMPTY_DEFAULTS)
    onClear?.()
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
      <section className={SECTION_CLASS}>
        <SectionTitle title={t('evaluation.manual.identityTitle')} required />
        <div className="flex flex-col gap-3">
          <Field label={t('evaluation.manual.nameLabel')} error={formState.errors.name?.message} htmlFor="mef-name">
            <Input id="mef-name" autoComplete="name" disabled={disabled} {...register('name')} />
          </Field>
          <Field
            label={t('evaluation.manual.icLabel')}
            help={t('evaluation.manual.icHelp')}
            error={formState.errors.ic?.message}
            htmlFor="mef-ic"
          >
            <Controller
              control={control}
              name="ic"
              render={({ field }) => (
                <Input
                  id="mef-ic"
                  inputMode="numeric"
                  // Allow 14 chars typed (12 digits + 2 dashes) so a pasted
                  // `YYMMDD-PP-####` survives the keystroke before the mask
                  // strips it back to 12 raw digits.
                  maxLength={14}
                  autoComplete="off"
                  placeholder={t('evaluation.manual.icPlaceholder')}
                  disabled={disabled}
                  value={field.value}
                  onChange={(e) => field.onChange(formatIcMask(e.target.value))}
                  onBlur={field.onBlur}
                />
              )}
            />
          </Field>
        </div>
      </section>

      <section className={SECTION_CLASS}>
        <SectionTitle title={t('evaluation.manual.incomeTitle')} required />
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={t('evaluation.manual.incomeLabel')}
              help={t('evaluation.manual.incomeHelp')}
              error={formState.errors.monthly_income_rm?.message}
              htmlFor="mef-income"
            >
              <Input
                id="mef-income"
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                disabled={disabled}
                {...register('monthly_income_rm', { valueAsNumber: true })}
              />
            </Field>
            <Field
              label={t('evaluation.manual.employmentLabel')}
              help={t('evaluation.manual.employmentHelp')}
              error={formState.errors.employment_type?.message}
            >
              <Controller
                control={control}
                name="employment_type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(next: unknown) => field.onChange(next as 'gig' | 'salaried')}
                    disabled={disabled}
                  >
                    <SelectTrigger aria-label={t('evaluation.manual.employmentLabel')}>
                      <SelectValue>
                        {field.value === 'salaried'
                          ? t('evaluation.manual.employmentSalaried')
                          : t('evaluation.manual.employmentGig')}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gig">{t('evaluation.manual.employmentGig')}</SelectItem>
                      <SelectItem value="salaried">{t('evaluation.manual.employmentSalaried')}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>
        </div>
      </section>

      <section className={SECTION_CLASS}>
        <SectionTitle title={t('evaluation.manual.utilityTitle')} required={false} />
        <div className="flex flex-col gap-3">
          <Field
            label={t('evaluation.manual.addressLabel')}
            error={formState.errors.address?.message}
            htmlFor="mef-address"
          >
            <Textarea id="mef-address" rows={3} maxLength={300} disabled={disabled} {...register('address')} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={t('evaluation.manual.costLabel')}
              help={t('evaluation.manual.costHelp')}
              error={formState.errors.monthly_cost_rm?.message}
              htmlFor="mef-cost"
            >
              <Input
                id="mef-cost"
                type="number"
                inputMode="decimal"
                step="0.01"
                min={0}
                max={100000}
                placeholder={t('evaluation.manual.costPlaceholder')}
                disabled={disabled}
                {...register('monthly_cost_rm')}
              />
            </Field>
            <Field
              label={t('evaluation.manual.kwhLabel')}
              help={t('evaluation.manual.kwhHelp')}
              error={formState.errors.monthly_kwh?.message}
              htmlFor="mef-kwh"
            >
              <Input
                id="mef-kwh"
                type="number"
                inputMode="numeric"
                min={0}
                max={10000}
                placeholder={t('evaluation.manual.kwhPlaceholder')}
                disabled={disabled}
                {...register('monthly_kwh')}
              />
            </Field>
          </div>
        </div>
      </section>

      <section className={SECTION_CLASS}>
        <SectionTitle
          title={t('evaluation.manual.householdTitle')}
          tooltip={t('evaluation.upload.householdHint')}
          required={false}
        />
        <div>
          <Controller
            control={control}
            name="dependants"
            render={({ field }) => (
              <DependantsFieldset
                value={watchedDependants}
                onChange={(next) => field.onChange(next)}
                disabled={disabled}
                showSummary={false}
              />
            )}
          />
        </div>
      </section>

      <div className="flex flex-col items-start gap-4 border-t border-foreground/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={handleClearInline}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Eraser className="size-4" aria-hidden />
          {t('evaluation.manual.clear')}
        </Button>
        <Button
          id={submitId}
          type="submit"
          size="lg"
          disabled={disabled || formState.isSubmitting}
          className="rounded-full bg-[color:var(--hibiscus)] px-6 text-[color:var(--hibiscus-foreground)] hover:bg-[color:var(--hibiscus)]/92"
        >
          {t('evaluation.upload.continue')}
          <ArrowRight className="ml-1.5 size-4" aria-hidden />
        </Button>
      </div>
    </form>
  )
}

function SectionTitle({ title, tooltip, required }: { title: string; tooltip?: string; required: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <h2 className="font-heading text-base font-semibold leading-snug tracking-tight">{title}</h2>
      {tooltip && <InfoTooltip content={tooltip} label={tooltip} />}
      <SectionBadge required={required} />
    </div>
  )
}

function Field({
  label,
  help,
  error,
  htmlFor,
  children
}: {
  label: string
  help?: string
  error?: string
  htmlFor?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <LabelRow htmlFor={htmlFor} label={label} tooltip={help} />
      {children}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function LabelRow({ htmlFor, label, tooltip }: { htmlFor?: string; label: string; tooltip?: string }) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {tooltip && <InfoTooltip content={tooltip} label={tooltip} />}
    </div>
  )
}

