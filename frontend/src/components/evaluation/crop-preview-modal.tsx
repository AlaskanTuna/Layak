'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Crop as CropIcon, Loader2, RotateCcw } from 'lucide-react'
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop
} from 'react-image-crop'
import { useTranslation } from 'react-i18next'

import 'react-image-crop/dist/ReactCrop.css'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'

type Props = {
  open: boolean
  /** The image File the user just selected. Caller should only mount this
   * modal for `image/jpeg` or `image/png`; PDFs bypass the preview. */
  file: File | null
  /** User confirmed the crop (or accepted as-is). The returned File is the
   * cropped JPG/PNG that should enter the pipeline. Filename is preserved;
   * MIME defaults to the source's MIME. */
  onConfirm: (cropped: File) => void
  /** User cancelled. The slot's File should be cleared so they re-pick. */
  onCancel: () => void
}

// 95% by default leaves a small visible margin so the crop handles are
// reachable even when the photo fills the viewport tightly.
const DEFAULT_CROP_PCT = 95

function makeDefaultCrop(width: number, height: number): Crop {
  return centerCrop(
    makeAspectCrop(
      { unit: '%', width: DEFAULT_CROP_PCT },
      width / height,
      width,
      height
    ),
    width,
    height
  )
}

async function cropToFile(
  image: HTMLImageElement,
  pixelCrop: PixelCrop,
  filename: string,
  mimeType: string
): Promise<File> {
  // Map displayed-pixel crop coords back to the source image's natural
  // resolution so we don't downsample. naturalWidth/Height is the original;
  // image.width/height is whatever the browser laid out.
  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height
  const sourceX = pixelCrop.x * scaleX
  const sourceY = pixelCrop.y * scaleY
  const sourceW = pixelCrop.width * scaleX
  const sourceH = pixelCrop.height * scaleY

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(sourceW))
  canvas.height = Math.max(1, Math.round(sourceH))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Unable to get 2D canvas context for crop')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(image, sourceX, sourceY, sourceW, sourceH, 0, 0, canvas.width, canvas.height)

  return new Promise<File>((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (!blob) {
          reject(new Error('Canvas toBlob returned null'))
          return
        }
        resolve(new File([blob], filename, { type: mimeType, lastModified: Date.now() }))
      },
      mimeType,
      0.92
    )
  })
}

export function CropPreviewModal({ open, file, onConfirm, onCancel }: Props) {
  const { t } = useTranslation()
  const imgRef = useRef<HTMLImageElement | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [crop, setCrop] = useState<Crop | undefined>()
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | undefined>()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mint a fresh blob URL per file. revoke on unmount or on file swap to
  // keep memory bounded (Phase 7 Task 4 hit the same pattern). The setStates
  // here mirror file → derived UI state and pair with a cleanup that revokes
  // the URL — a synchronous in-effect setState is the right shape, even
  // though the rule's strict reading flags it.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!file) {
      setObjectUrl(null)
      setCrop(undefined)
      setCompletedCrop(undefined)
      setError(null)
      return
    }
    const url = URL.createObjectURL(file)
    setObjectUrl(url)
    setCrop(undefined)
    setCompletedCrop(undefined)
    setError(null)
    return () => {
      URL.revokeObjectURL(url)
    }
  }, [file])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget
    const next = makeDefaultCrop(width, height)
    setCrop(next)
    // Seed completedCrop with the pixel equivalent so a user who confirms
    // without ever dragging still gets a well-formed crop instead of `undefined`.
    setCompletedCrop({
      unit: 'px',
      x: (next.x / 100) * width,
      y: (next.y / 100) * height,
      width: (next.width / 100) * width,
      height: (next.height / 100) * height
    })
  }, [])

  const handleReset = useCallback(() => {
    if (!imgRef.current) return
    const { width, height } = imgRef.current
    const next = makeDefaultCrop(width, height)
    setCrop(next)
    setCompletedCrop({
      unit: 'px',
      x: (next.x / 100) * width,
      y: (next.y / 100) * height,
      width: (next.width / 100) * width,
      height: (next.height / 100) * height
    })
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!file || !imgRef.current || !completedCrop) return
    setProcessing(true)
    setError(null)
    try {
      // Empty rectangles (user dragged a 0x0 selection) — fall back to the
      // full image so the pipeline still gets pixels.
      const usable =
        completedCrop.width >= 1 && completedCrop.height >= 1
          ? completedCrop
          : ({
              unit: 'px',
              x: 0,
              y: 0,
              width: imgRef.current.width,
              height: imgRef.current.height
            } as PixelCrop)
      const cropped = await cropToFile(imgRef.current, usable, file.name, file.type)
      onConfirm(cropped)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setProcessing(false)
    }
  }, [file, completedCrop, onConfirm])

  const canConfirm = !processing && objectUrl !== null && completedCrop !== undefined

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next && !processing) onCancel()
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="size-4 text-primary" aria-hidden />
            {t('evaluation.upload.crop.title')}
          </DialogTitle>
          <DialogDescription>
            {t('evaluation.upload.crop.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex max-h-[60vh] items-center justify-center overflow-auto rounded-md border border-border bg-muted/30 p-3">
          {objectUrl ? (
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={c => setCompletedCrop(c)}
              keepSelection
              ruleOfThirds
              className="max-h-[55vh]"
            >
              {/* next/image rejects blob: URLs and would need a remote loader; the
                  preview is throwaway DOM, not an LCP candidate, so a plain <img> is
                  the right primitive here. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={objectUrl}
                alt={t('evaluation.upload.crop.imageAlt')}
                onLoad={handleImageLoad}
                className="max-h-[55vh] w-auto"
              />
            </ReactCrop>
          ) : (
            <div className="flex h-40 items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              {t('evaluation.upload.crop.loading')}
            </div>
          )}
        </div>

        {error && (
          <p className="text-xs text-destructive" role="alert">
            {t('evaluation.upload.crop.processingError', { message: error })}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={handleReset}
            disabled={!objectUrl || processing}
          >
            <RotateCcw className="mr-1.5 size-3.5" aria-hidden />
            {t('evaluation.upload.crop.reset')}
          </Button>
          <Button type="button" variant="outline" onClick={onCancel} disabled={processing}>
            {t('evaluation.upload.crop.cancel')}
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!canConfirm}>
            {processing && <Loader2 className="mr-1.5 size-3.5 animate-spin" aria-hidden />}
            {t('evaluation.upload.crop.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
