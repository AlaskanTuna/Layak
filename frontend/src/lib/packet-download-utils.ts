import type { Packet } from '@/lib/agent-types'

export function base64ToBlob(b64: string, mime = 'application/pdf'): Blob {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function downloadAllDrafts(packet: Packet | null): void {
  if (!packet) return
  for (const draft of packet.drafts) {
    if (!draft.blob_bytes_b64) continue
    const blob = base64ToBlob(draft.blob_bytes_b64)
    triggerDownload(blob, draft.filename)
  }
}

export function hasDownloadableDrafts(packet: Packet | null): boolean {
  if (!packet) return false
  return packet.drafts.some(d => d.blob_bytes_b64 != null)
}
