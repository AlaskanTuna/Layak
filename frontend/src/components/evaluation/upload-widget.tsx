'use client'

import { useId, useRef, useState } from 'react'
import { ArrowRight, FileText, Loader2, Sparkles, UploadCloud, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

import { DependantsFieldset, type DependantInputRow } from '@/components/evaluation/dependants-fieldset'
import { SectionBadge } from '@/components/evaluation/section-badge'
import { Button } from '@/components/ui/button'
import type { DependantInput } from '@/lib/agent-types'
import { cn } from '@/lib/utils'

const MAX_FILE_BYTES = 10 * 1024 * 1024
const ACCEPTED_MIME_PREFIXES = ['image/', 'application/pdf']
const ACCEPT_ATTR = 'image/*,application/pdf'

export type UploadSlot = 'ic' | 'payslip' | 'utility'

export type UploadFiles = Record<UploadSlot, File>

/** Shape the upload widget yields on submit. Dependants are optional — an
 * empty list is submitted as an empty array and the backend treats it as
 * "no override," letting the OCR path's default (empty household) stand. */
export type UploadSubmission = {
  files: UploadFiles
  dependants: DependantInput[]
}

type SlotSpec = {
  slot: UploadSlot
  labelKey: string
  hintKey: string
  required: boolean
}

const SLOT_SPECS: SlotSpec[] = [
  { slot: 'ic', labelKey: 'evaluation.upload.sectionIc', hintKey: 'evaluation.upload.hintIc', required: true },
  { slot: 'payslip', labelKey: 'evaluation.upload.sectionPayslip', hintKey: 'evaluation.upload.hintPayslip', required: true },
  { slot: 'utility', labelKey: 'evaluation.upload.sectionUtility', hintKey: 'evaluation.upload.hintUtility', required: true }
]

function validate(file: File, t: TFunction): string | null {
  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    return t('evaluation.upload.errorFileSize', { size: mb })
  }
  if (!ACCEPTED_MIME_PREFIXES.some(prefix => file.type.startsWith(prefix))) {
    return t('evaluation.upload.errorFileType', { type: file.type || 'unknown' })
  }
  return null
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type FileSlotState = {
  file: File | null
  error: string | null
}

// Phase 7 Task 2 — sample data now has two personas (Aisyah gig, Farhan
// salaried) so the demo can side-by-side both form types in one flow.
export type SamplePersona = 'aisyah' | 'farhan'

type Props = {
  onSubmit: (submission: UploadSubmission) => void
  onUseSamples: (persona: SamplePersona) => void
  disabled?: boolean
  /** Which persona's fixtures are currently being fetched from /public/fixtures/,
   * or `null` when idle. Drives the per-button spinner + disable state so only
   * the clicked button spins, not both. */
  samplesLoading?: SamplePersona | null
}

type SlotProps = {
  spec: SlotSpec
  state: FileSlotState
  inputId: string
  disabled: boolean
  inputRef: (el: HTMLInputElement | null) => void
  onChange: (file: File | null) => void
  onClear: () => void
}

function UploadSlotCard({ spec, state, inputId, disabled, inputRef, onChange, onClear }: SlotProps) {
  const { t } = useTranslation()
  const { file, error } = state
  const errorId = `${inputId}-error`
  const label = t(spec.labelKey)
  const hint = t(spec.hintKey)

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <p className="font-heading text-base font-semibold tracking-tight">{label}</p>
          <SectionBadge required={spec.required} />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      </div>

      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <FileText className="size-4" aria-hidden />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{file.name}</span>
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                {formatSize(file.size)}
              </span>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClear}
            aria-label={t('common.aria.clearField', { fieldName: label })}
            disabled={disabled}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background/40 px-6 py-8 text-center transition-colors hover:border-primary/40 hover:bg-background/70',
            error && 'border-destructive/40 bg-destructive/5 hover:border-destructive/60',
            disabled && 'pointer-events-none opacity-50'
          )}
        >
          <div className="flex size-10 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <UploadCloud className="size-5" aria-hidden />
          </div>
          <p className="text-sm">
            <span className="font-medium text-primary">{t('evaluation.upload.dropzonePrimary')}</span>{' '}
            <span className="text-muted-foreground">{t('evaluation.upload.dropzoneSecondary')}</span>
          </p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {t('evaluation.upload.dropzoneFormats')}
          </p>
        </label>
      )}

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept={ACCEPT_ATTR}
        capture="environment"
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="sr-only"
        onChange={e => onChange(e.target.files?.[0] ?? null)}
      />

      {error && (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function UploadWidget({ onSubmit, onUseSamples, disabled = false, samplesLoading = null }: Props) {
  const { t } = useTranslation()
  const reactId = useId()
  const [state, setState] = useState<Record<UploadSlot, FileSlotState>>({
    ic: { file: null, error: null },
    payslip: { file: null, error: null },
    utility: { file: null, error: null }
  })
  const [dependants, setDependants] = useState<DependantInputRow[]>([])
  const inputRefs = useRef<Record<UploadSlot, HTMLInputElement | null>>({
    ic: null,
    payslip: null,
    utility: null
  })

  const canSubmit = (['ic', 'payslip', 'utility'] as const).every(
    s => state[s].file !== null && state[s].error === null
  )

  function handleFileChange(slot: UploadSlot, file: File | null) {
    if (!file) {
      setState(prev => ({ ...prev, [slot]: { file: null, error: null } }))
      return
    }
    const error = validate(file, t)
    setState(prev => ({ ...prev, [slot]: { file: error ? null : file, error } }))
  }

  function handleClear(slot: UploadSlot) {
    setState(prev => ({ ...prev, [slot]: { file: null, error: null } }))
    const el = inputRefs.current[slot]
    if (el) el.value = ''
  }

  function handleSubmit() {
    if (!canSubmit) return
    onSubmit({
      files: {
        ic: state.ic.file!,
        payslip: state.payslip.file!,
        utility: state.utility.file!
      },
      dependants: dependants.map(d => ({
        relationship: d.relationship,
        age: d.age,
        ic_last4: d.ic_last4 === '' ? null : d.ic_last4
      }))
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        {SLOT_SPECS.map(spec => {
          const inputId = `${reactId}-${spec.slot}`
          return (
            <UploadSlotCard
              key={spec.slot}
              spec={spec}
              state={state[spec.slot]}
              inputId={inputId}
              disabled={disabled}
              inputRef={el => {
                inputRefs.current[spec.slot] = el
              }}
              onChange={file => handleFileChange(spec.slot, file)}
              onClear={() => handleClear(spec.slot)}
            />
          )
        })}
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <p className="font-heading text-base font-semibold tracking-tight">
                {t('evaluation.upload.householdTitle')}
              </p>
              <SectionBadge required={false} />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              {t('evaluation.upload.householdHint')}
            </p>
          </div>
          <DependantsFieldset value={dependants} onChange={setDependants} disabled={disabled} />
        </div>
      </div>

      <div className="flex flex-col items-start gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <SamplePersonaButton
            persona="aisyah"
            label={t('evaluation.upload.useSamplesAisyah')}
            loading={samplesLoading === 'aisyah'}
            disabled={disabled || samplesLoading !== null}
            onClick={() => onUseSamples('aisyah')}
          />
          <span aria-hidden className="text-xs text-muted-foreground/60">
            {t('evaluation.upload.samplesDivider')}
          </span>
          <SamplePersonaButton
            persona="farhan"
            label={t('evaluation.upload.useSamplesFarhan')}
            loading={samplesLoading === 'farhan'}
            disabled={disabled || samplesLoading !== null}
            onClick={() => onUseSamples('farhan')}
          />
        </div>
        <Button type="button" onClick={handleSubmit} disabled={disabled || !canSubmit} size="lg">
          {t('evaluation.upload.continue')}
          <ArrowRight className="ml-1.5 size-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}

function SamplePersonaButton({
  persona,
  label,
  loading,
  disabled,
  onClick
}: {
  persona: SamplePersona
  label: string
  loading: boolean
  disabled: boolean
  onClick: () => void
}) {
  const { t } = useTranslation()
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      data-persona={persona}
      className="px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
    >
      {loading ? (
        <>
          <Loader2 className="mr-1.5 size-4 animate-spin" aria-hidden />
          {t('evaluation.upload.loadingSamples')}
        </>
      ) : (
        <>
          <Sparkles className="mr-1.5 size-4" aria-hidden />
          {label}
        </>
      )}
    </Button>
  )
}
