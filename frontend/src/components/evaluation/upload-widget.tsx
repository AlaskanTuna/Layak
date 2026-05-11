'use client'

import { useId, useRef, useState } from 'react'
import { ArrowRight, ChevronDown, Eye, FileText, UploadCloud, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'

import { CropPreviewModal } from '@/components/evaluation/crop-preview-modal'
import { DependantsFieldset, type DependantInputRow } from '@/components/evaluation/dependants-fieldset'
import { SectionBadge } from '@/components/evaluation/section-badge'
import { Button } from '@/components/ui/button'
import { InfoTooltip } from '@/components/ui/info-tooltip'
import type { DependantInput } from '@/lib/agent-types'
import { cn } from '@/lib/utils'

const MAX_FILE_BYTES = 10 * 1024 * 1024
// Strict allowlist — tightened from a looser `image/*` prefix because
// BMP / TIFF / HEIC sneak past the broader check but fail the OCR path.
// JPG, PNG, PDF only — same set the dropzone label advertises.
const ACCEPTED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'application/pdf'])
const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png'])
const ACCEPT_ATTR = 'image/jpeg,image/png,application/pdf'

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
  {
    slot: 'payslip',
    labelKey: 'evaluation.upload.sectionPayslip',
    hintKey: 'evaluation.upload.hintPayslip',
    required: true
  },
  {
    slot: 'utility',
    labelKey: 'evaluation.upload.sectionUtility',
    hintKey: 'evaluation.upload.hintUtility',
    required: true
  }
]

function validate(file: File, t: TFunction): string | null {
  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1)
    return t('evaluation.upload.errorFileSize', { size: mb })
  }
  if (!ACCEPTED_MIME_TYPES.has(file.type)) {
    return t('evaluation.upload.errorFileTypeStrict', { type: file.type || 'unknown' })
  }
  return null
}

function isImageFile(file: File): boolean {
  return IMAGE_MIME_TYPES.has(file.type)
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Open the user-selected file in a fresh tab. Uses an object URL so neither
 * the file's bytes nor a copy ever leave the browser. The URL is revoked
 * after 60s — long enough for the new tab to finish loading the resource.
 */
function previewFileInNewTab(file: File): void {
  if (typeof window === 'undefined') return
  const url = URL.createObjectURL(file)
  window.open(url, '_blank', 'noopener,noreferrer')
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

type FileSlotState = {
  file: File | null
  error: string | null
}

// Sample data has two personas (Aisyah gig, Farhan salaried) so the demo
// can side-by-side both form types in one flow.
export type SamplePersona = 'aisyah' | 'farhan'

type Props = {
  onSubmit: (submission: UploadSubmission) => void
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
  const { t } = useTranslation()
  const { file, error } = state
  const errorId = `${inputId}-error`
  const label = t(spec.labelKey)
  const hint = t(spec.hintKey)

  return (
    <div className="paper-card flex flex-col gap-3 rounded-[14px] p-5 sm:p-6">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <p className="font-sans text-base font-medium tracking-tight">{label}</p>
          <InfoTooltip content={hint} label={hint} />
          <SectionBadge required={spec.required} />
        </div>
      </div>

      {file ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-[color:var(--forest)]/35 bg-[color:var(--forest)]/[0.06] p-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[color:var(--forest)]/14 text-[color:var(--forest)]">
              <FileText className="size-4" aria-hidden />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{file.name}</span>
              <span className="mono-caption text-foreground/55">{formatSize(file.size)}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => previewFileInNewTab(file)}
              aria-label={t('evaluation.upload.previewAria', { fieldName: label })}
              disabled={disabled}
            >
              <Eye className="size-4" aria-hidden />
            </Button>
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
        </div>
      ) : (
        <label
          htmlFor={inputId}
          className={cn(
            'flex min-h-[180px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-foreground/15 bg-foreground/[0.02] px-6 py-10 text-center transition-colors hover:border-[color:var(--hibiscus)]/45 hover:bg-[color:var(--hibiscus)]/[0.03] sm:min-h-[220px] sm:gap-4 sm:py-14',
            error && 'border-[color:var(--hibiscus)]/55 bg-[color:var(--hibiscus)]/[0.06] hover:border-[color:var(--hibiscus)]/70',
            disabled && 'pointer-events-none opacity-50'
          )}
        >
          <div className="flex size-9 items-center justify-center rounded-md bg-foreground/[0.06] text-foreground/55">
            <UploadCloud className="size-4" aria-hidden />
          </div>
          <p className="text-sm">
            <span className="font-medium text-[color:var(--hibiscus)]">{t('evaluation.upload.dropzonePrimary')}</span>{' '}
            <span className="text-foreground/65">{t('evaluation.upload.dropzoneSecondary')}</span>
          </p>
          <p className="mono-caption text-foreground/55">{t('evaluation.upload.dropzoneFormats')}</p>
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
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />

      {error && (
        <p id={errorId} className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

export function UploadWidget({ onSubmit, disabled = false }: Props) {
  const { t } = useTranslation()
  const reactId = useId()
  const [showHousehold, setShowHousehold] = useState(false)
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
  // Crop preview is per-slot. We hold the in-flight image (the one the
  // user just selected, validated as JPG/PNG) on a separate pending-slot
  // pair so the slot's `state.file` is only populated AFTER the user
  // confirms (or is bypassed for PDFs entirely).
  const [pendingCrop, setPendingCrop] = useState<{ slot: UploadSlot; file: File } | null>(null)

  const canSubmit = (['ic', 'payslip', 'utility'] as const).every(
    (s) => state[s].file !== null && state[s].error === null
  )

  function commitFile(slot: UploadSlot, file: File) {
    setState((prev) => ({ ...prev, [slot]: { file, error: null } }))
  }

  function handleFileChange(slot: UploadSlot, file: File | null) {
    if (!file) {
      setState((prev) => ({ ...prev, [slot]: { file: null, error: null } }))
      return
    }
    const error = validate(file, t)
    if (error) {
      setState((prev) => ({ ...prev, [slot]: { file: null, error } }))
      return
    }
    if (isImageFile(file)) {
      // Hold the slot blank until the user confirms the crop. Surfacing the
      // file in the slot prematurely would let them hit Continue while the
      // crop modal is still open.
      setState((prev) => ({ ...prev, [slot]: { file: null, error: null } }))
      setPendingCrop({ slot, file })
      return
    }
    // PDFs skip the preview/crop step entirely — direct extraction path.
    commitFile(slot, file)
  }

  function handleCropConfirm(cropped: File) {
    if (!pendingCrop) return
    commitFile(pendingCrop.slot, cropped)
    setPendingCrop(null)
  }

  function handleCropCancel() {
    if (!pendingCrop) return
    // Reset the hidden input so re-picking the same filename re-triggers
    // onChange. Without this, browsers swallow the second pick as a no-op.
    const el = inputRefs.current[pendingCrop.slot]
    if (el) el.value = ''
    setPendingCrop(null)
  }

  function handleClear(slot: UploadSlot) {
    setState((prev) => ({ ...prev, [slot]: { file: null, error: null } }))
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
      dependants: dependants.map((d) => ({
        relationship: d.relationship,
        age: d.age,
        ic_last4: d.ic_last4 === '' ? null : d.ic_last4
      }))
    })
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4">
        {SLOT_SPECS.map((spec) => {
          const inputId = `${reactId}-${spec.slot}`
          return (
            <UploadSlotCard
              key={spec.slot}
              spec={spec}
              state={state[spec.slot]}
              inputId={inputId}
              disabled={disabled}
              inputRef={(el) => {
                inputRefs.current[spec.slot] = el
              }}
              onChange={(file) => handleFileChange(spec.slot, file)}
              onClear={() => handleClear(spec.slot)}
            />
          )
        })}
        <div className="paper-card flex flex-col gap-3 rounded-[14px] p-5 sm:p-6">
          {/* `role="button"` instead of a real <button> — the row contains
              an InfoTooltip which renders its own <button>, and HTML
              disallows nested buttons (hydration error). The tooltip's
              click is swallowed inline so it doesn't bubble up and toggle
              the disclosure. */}
          <div
            role="button"
            tabIndex={0}
            className="flex w-full cursor-pointer items-start justify-between gap-3 text-left"
            onClick={() => setShowHousehold((prev) => !prev)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                setShowHousehold((prev) => !prev)
              }
            }}
            aria-expanded={showHousehold}
          >
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <p className="font-sans text-base font-medium tracking-tight">
                  {t('evaluation.upload.householdTitle')}
                </p>
                <span
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                  className="inline-flex"
                >
                  <InfoTooltip
                    content={t('evaluation.upload.householdHint')}
                    label={t('evaluation.upload.householdHint')}
                  />
                </span>
                <SectionBadge required={false} />
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {dependants.length > 0
                  ? t('evaluation.upload.householdAdded', { count: dependants.length })
                  : t('evaluation.upload.householdCollapsed')}
              </p>
            </div>
            <ChevronDown
              className={cn(
                'mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform',
                showHousehold && 'rotate-180'
              )}
              aria-hidden
            />
          </div>
          {showHousehold && (
            <DependantsFieldset value={dependants} onChange={setDependants} disabled={disabled} showSummary={false} />
          )}
        </div>
      </div>

      <div className="flex justify-end border-t border-foreground/10 pt-5">
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={disabled || !canSubmit}
          size="lg"
          className="rounded-full bg-[color:var(--hibiscus)] px-6 text-[color:var(--hibiscus-foreground)] hover:bg-[color:var(--hibiscus)]/92"
        >
          {t('evaluation.upload.continue')}
          <ArrowRight className="ml-1.5 size-4" aria-hidden />
        </Button>
      </div>

      <CropPreviewModal
        open={pendingCrop !== null}
        file={pendingCrop?.file ?? null}
        onConfirm={handleCropConfirm}
        onCancel={handleCropCancel}
      />
    </div>
  )
}
