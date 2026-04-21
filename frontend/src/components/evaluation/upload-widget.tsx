'use client'

import { useId, useRef, useState } from 'react'
import { ArrowRight, FileText, Sparkles, UploadCloud, X } from 'lucide-react'

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
  label: string
  hint: string
  required: boolean
}

const SLOT_SPECS: SlotSpec[] = [
  {
    slot: 'ic',
    label: 'MyKad (IC)',
    hint: 'Front of your Malaysian identity card, clearly showing your details.',
    required: true
  },
  {
    slot: 'payslip',
    label: 'Payslip or income statement',
    hint: 'Latest month if available; self-employed filers can upload a bank statement or LHDN form.',
    required: true
  },
  {
    slot: 'utility',
    label: 'Utility bill',
    hint: 'Water, electricity, or broadband bill for address verification — within the last three months.',
    required: true
  }
]

function validate(file: File): string | null {
  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    return `File is ${mb} MB — max is 10 MB.`
  }
  if (!ACCEPTED_MIME_PREFIXES.some(prefix => file.type.startsWith(prefix))) {
    return `Unsupported file type (${file.type || 'unknown'}). Upload an image or PDF.`
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

type Props = {
  onSubmit: (submission: UploadSubmission) => void
  onUseSamples: () => void
  disabled?: boolean
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
  const { file, error } = state
  const errorId = `${inputId}-error`

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <p className="font-heading text-base font-semibold tracking-tight">{spec.label}</p>
          <SectionBadge required={spec.required} />
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{spec.hint}</p>
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
            aria-label={`Clear ${spec.label}`}
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
            <span className="font-medium text-primary">Click to upload</span>{' '}
            <span className="text-muted-foreground">or drag and drop</span>
          </p>
          <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            JPG, PNG, or PDF up to 10MB
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

export function UploadWidget({ onSubmit, onUseSamples, disabled = false }: Props) {
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
    const error = validate(file)
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
              <p className="font-heading text-base font-semibold tracking-tight">Household</p>
              <SectionBadge required={false} />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Documents don&apos;t list your dependants. Add children / parents / other household
              members here so schemes that gate on them (JKM Warga Emas, LHDN child relief) surface.
            </p>
          </div>
          <DependantsFieldset value={dependants} onChange={setDependants} disabled={disabled} />
        </div>
      </div>

      <div className="flex flex-col items-start gap-4 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onUseSamples}
          disabled={disabled}
          className="px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          <Sparkles className="mr-1.5 size-4" aria-hidden />
          Use Aisyah sample documents
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={disabled || !canSubmit} size="lg">
          Continue evaluation
          <ArrowRight className="ml-1.5 size-4" aria-hidden />
        </Button>
      </div>
    </div>
  )
}
