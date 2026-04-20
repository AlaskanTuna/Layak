'use client'

import { useId, useRef, useState } from 'react'
import { FileText, Sparkles, Upload, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const MAX_FILE_BYTES = 10 * 1024 * 1024
const ACCEPTED_MIME_PREFIXES = ['image/', 'application/pdf']
const ACCEPT_ATTR = 'image/*,application/pdf'

export type UploadSlot = 'ic' | 'payslip' | 'utility'

export type UploadFiles = Record<UploadSlot, File>

type SlotSpec = {
  slot: UploadSlot
  label: string
  hint: string
}

const SLOT_SPECS: SlotSpec[] = [
  { slot: 'ic', label: 'MyKad (IC)', hint: 'Front of your Malaysian identity card.' },
  { slot: 'payslip', label: 'Payslip or income statement', hint: 'Most recent month; self-employed filers can upload a bank statement.' },
  { slot: 'utility', label: 'Utility bill', hint: 'TNB, Air Selangor, or similar — within the last three months.' }
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
  onSubmit: (files: UploadFiles) => void
  onUseSamples: () => void
  disabled?: boolean
}

export function UploadWidget({ onSubmit, onUseSamples, disabled = false }: Props) {
  const reactId = useId()
  const [state, setState] = useState<Record<UploadSlot, FileSlotState>>({
    ic: { file: null, error: null },
    payslip: { file: null, error: null },
    utility: { file: null, error: null }
  })
  const inputRefs = useRef<Record<UploadSlot, HTMLInputElement | null>>({
    ic: null,
    payslip: null,
    utility: null
  })

  const allValid = (['ic', 'payslip', 'utility'] as const).every(s => state[s].file !== null && state[s].error === null)

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
    if (!allValid) return
    onSubmit({
      ic: state.ic.file!,
      payslip: state.payslip.file!,
      utility: state.utility.file!
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        We store nothing. Draft only — you submit manually. Max 10 MB per file. Image or PDF.
      </p>

      <div className="flex flex-col gap-4">
        {SLOT_SPECS.map(({ slot, label, hint }) => {
          const { file, error } = state[slot]
          const inputId = `${reactId}-${slot}`
          const errorId = `${reactId}-${slot}-error`
          return (
            <div key={slot} className="flex flex-col gap-1.5">
              <Label htmlFor={inputId}>{label}</Label>
              <p className="text-xs text-muted-foreground">{hint}</p>
              <div className="flex items-center gap-2">
                <Input
                  ref={(el: HTMLInputElement | null) => {
                    inputRefs.current[slot] = el
                  }}
                  id={inputId}
                  type="file"
                  accept={ACCEPT_ATTR}
                  capture="environment"
                  disabled={disabled}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  className={cn('file:mr-2', file && 'text-sm')}
                  onChange={e => handleFileChange(slot, e.target.files?.[0] ?? null)}
                />
                {file && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleClear(slot)}
                    aria-label={`Clear ${label}`}
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                )}
              </div>
              {file && (
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FileText className="size-3.5" aria-hidden />
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0">· {formatSize(file.size)}</span>
                </p>
              )}
              {error && (
                <p id={errorId} className="text-xs text-destructive" role="alert">
                  {error}
                </p>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" onClick={handleSubmit} disabled={disabled || !allValid} className="flex-1">
          <Upload className="mr-2 size-4" aria-hidden />
          Continue
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onUseSamples}
          disabled={disabled}
          className="flex-1"
        >
          <Sparkles className="mr-2 size-4" aria-hidden />
          Use Aisyah sample documents
        </Button>
      </div>
    </div>
  )
}
