'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Sparkles, Trash2 } from 'lucide-react'
import { useEffect } from 'react'
import { type SubmitHandler, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import type { ManualEntryPayload, Relationship } from '@/lib/agent-types'

const RELATIONSHIPS = ['child', 'parent', 'spouse', 'sibling', 'other'] as const satisfies readonly Relationship[]

const dependantSchema = z.object({
  relationship: z.enum(RELATIONSHIPS),
  age: z.number().int().min(0).max(130),
  ic_last4: z
    .string()
    .refine(v => v === '' || /^\d{4}$/.test(v), { message: '4 digits or blank' })
})

const manualEntrySchema = z.object({
  name: z.string().trim().min(1, 'Required').max(200),
  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Required')
    .refine(
      v => {
        const d = new Date(v)
        return !Number.isNaN(d.getTime()) && d.getFullYear() >= 1900 && d <= new Date()
      },
      { message: 'Must be a past date' }
    ),
  ic_last4: z.string().regex(/^\d{4}$/, '4 digits'),
  monthly_income_rm: z.number().min(0).max(1_000_000),
  employment_type: z.enum(['gig', 'salaried']),
  address: z.string().max(500),
  dependants: z.array(dependantSchema).max(15)
})

type FormValues = z.infer<typeof manualEntrySchema>

/**
 * Aisyah defaults for one-click pre-fill (FR-10 parity with upload-path samples).
 * DOB 1992-03-24 derives age 34 against any 2026 reference date after 24 Mar.
 */
const AISYAH_DEFAULTS: FormValues = {
  name: 'Aisyah binti Ahmad',
  date_of_birth: '1992-03-24',
  ic_last4: '4321',
  monthly_income_rm: 2800,
  employment_type: 'gig',
  address: 'No. 42, Jalan IM 7/10, Bandar Indera Mahkota, 25200 Kuantan, Pahang',
  dependants: [
    { relationship: 'child', age: 10, ic_last4: '' },
    { relationship: 'child', age: 7, ic_last4: '' },
    { relationship: 'parent', age: 70, ic_last4: '' }
  ]
}

const EMPTY_DEFAULTS: FormValues = {
  name: '',
  date_of_birth: '',
  ic_last4: '',
  monthly_income_rm: 0,
  employment_type: 'gig',
  address: '',
  dependants: []
}

type Props = {
  onSubmit: (payload: ManualEntryPayload) => void
  onUseSamples: () => void
  disabled?: boolean
  /** When true, form pre-fills with Aisyah values on mount. Toggles demo banner upstream. */
  prefillAisyah?: boolean
}

export function ManualEntryForm({ onSubmit, onUseSamples, disabled = false, prefillAisyah = false }: Props) {
  const form = useForm<FormValues>({
    resolver: zodResolver(manualEntrySchema),
    defaultValues: prefillAisyah ? AISYAH_DEFAULTS : EMPTY_DEFAULTS,
    mode: 'onBlur'
  })
  const { register, handleSubmit, control, formState, reset } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'dependants' })
  // `useWatch` is the memo-safe alternative to `form.watch()` — the React Compiler
  // plugin flags `watch()` because it can't reliably cache its result.
  const watchedDependants = useWatch({ control, name: 'dependants' }) ?? []

  // Re-apply Aisyah defaults when the toggle arrives after mount (e.g. URL ?mode=manual+demo).
  useEffect(() => {
    if (prefillAisyah) reset(AISYAH_DEFAULTS)
  }, [prefillAisyah, reset])

  const dependantsLen = watchedDependants.length
  const householdSize = 1 + dependantsLen

  const submit: SubmitHandler<FormValues> = values => {
    const payload: ManualEntryPayload = {
      name: values.name.trim(),
      date_of_birth: values.date_of_birth,
      ic_last4: values.ic_last4,
      monthly_income_rm: values.monthly_income_rm,
      employment_type: values.employment_type,
      address: values.address.trim().length > 0 ? values.address.trim() : null,
      dependants: values.dependants.map(d => ({
        relationship: d.relationship,
        age: d.age,
        ic_last4: d.ic_last4 === '' ? null : d.ic_last4
      }))
    }
    onSubmit(payload)
  }

  const handleUseAisyahInline = () => {
    reset(AISYAH_DEFAULTS)
    onUseSamples()
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="flex flex-col gap-4" noValidate>
      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Field label="Full name" error={formState.errors.name?.message} htmlFor="mef-name">
            <Input id="mef-name" autoComplete="name" disabled={disabled} {...register('name')} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Date of birth" error={formState.errors.date_of_birth?.message} htmlFor="mef-dob">
              <Input id="mef-dob" type="date" disabled={disabled} {...register('date_of_birth')} />
            </Field>
            <Field
              label="IC last 4 digits"
              help="We only collect the last 4 digits — your full MyKad never leaves your device."
              error={formState.errors.ic_last4?.message}
              htmlFor="mef-ic4"
            >
              <Input
                id="mef-ic4"
                inputMode="numeric"
                maxLength={4}
                autoComplete="off"
                disabled={disabled}
                {...register('ic_last4')}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Income</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label="Monthly income (RM)"
              help="Net payout for gig work, basic pay for salaried."
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
            <Field label="Employment type" error={formState.errors.employment_type?.message}>
              <fieldset className="flex flex-col gap-1.5" disabled={disabled}>
                <label className="flex items-start gap-2 text-sm">
                  <input type="radio" value="gig" {...register('employment_type')} className="mt-1" />
                  <span>
                    <span className="font-medium">Self-employed / gig</span>
                    <span className="block text-xs text-muted-foreground">Grab, Foodpanda, freelance — files LHDN Form B.</span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <input type="radio" value="salaried" {...register('employment_type')} className="mt-1" />
                  <span>
                    <span className="font-medium">Salaried employee</span>
                    <span className="block text-xs text-muted-foreground">Regular monthly salary — files LHDN Form BE.</span>
                  </span>
                </label>
              </fieldset>
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent>
          <Field label="Home address" help="Optional." error={formState.errors.address?.message} htmlFor="mef-address">
            <Textarea
              id="mef-address"
              rows={3}
              maxLength={500}
              disabled={disabled}
              {...register('address')}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Household</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            Add everyone else who shares your household. Children under 18 and parents aged 60+ unlock
            specific schemes — add them here. Household size: {householdSize} (you + {dependantsLen} dependant
            {dependantsLen === 1 ? '' : 's'}).
          </p>
          {fields.length === 0 && (
            <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
              No dependants yet. Click &ldquo;Add dependant&rdquo; to list each household member.
            </p>
          )}
          <ul className="flex flex-col gap-3">
            {fields.map((field, index) => (
              <li key={field.id} className="grid gap-2 rounded-md border border-border px-3 py-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <Field
                  label="Relationship"
                  error={formState.errors.dependants?.[index]?.relationship?.message}
                  htmlFor={`mef-dep-rel-${index}`}
                >
                  <select
                    id={`mef-dep-rel-${index}`}
                    disabled={disabled}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    {...register(`dependants.${index}.relationship` as const)}
                  >
                    {RELATIONSHIPS.map(r => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Age"
                  error={formState.errors.dependants?.[index]?.age?.message}
                  htmlFor={`mef-dep-age-${index}`}
                >
                  <Input
                    id={`mef-dep-age-${index}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={130}
                    disabled={disabled}
                    {...register(`dependants.${index}.age` as const, { valueAsNumber: true })}
                  />
                </Field>
                <Field
                  label="IC last 4 (optional)"
                  error={formState.errors.dependants?.[index]?.ic_last4?.message}
                  htmlFor={`mef-dep-ic-${index}`}
                >
                  <Input
                    id={`mef-dep-ic-${index}`}
                    inputMode="numeric"
                    maxLength={4}
                    disabled={disabled}
                    {...register(`dependants.${index}.ic_last4` as const)}
                  />
                </Field>
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
            disabled={disabled || fields.length >= 15}
            onClick={() => append({ relationship: 'child', age: 0, ic_last4: '' })}
            className="w-fit gap-1.5"
          >
            <Plus className="size-4" aria-hidden />
            Add dependant
          </Button>
        </CardContent>
      </Card>

      <Separator />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={disabled}
          onClick={handleUseAisyahInline}
          className="gap-1.5"
        >
          <Sparkles className="size-4" aria-hidden />
          Use Aisyah sample data
        </Button>
        <Button type="submit" disabled={disabled || formState.isSubmitting}>
          Generate packet
        </Button>
      </div>
    </form>
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
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
