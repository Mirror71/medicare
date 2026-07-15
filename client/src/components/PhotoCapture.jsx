import { useEffect, useRef, useState } from 'react'

const MAX_SIDE = 1024
const JPEG_QUALITY = 0.8
// ~4MB decoded ≈ 5.6M base64 characters.
const MAX_BASE64_LEN = 5_600_000

/**
 * Downscale a File to a JPEG whose longest side is ≤ MAX_SIDE (never upscaled),
 * returning the raw base64 string (no data-URL prefix).
 */
function processImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read failed'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('decode failed'))
      img.onload = () => {
        let { width, height } = img
        const longest = Math.max(width, height)
        if (longest > MAX_SIDE) {
          const scale = MAX_SIDE / longest
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
        resolve(dataUrl.split(',')[1] || '')
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

/**
 * Camera / gallery capture with preview + canvas downscale.
 * Props:
 *  - onCaptureComplete({ imageBase64, mimeType, fileName })
 *  - onCancel()
 */
export default function PhotoCapture({ onCaptureComplete, onCancel }) {
  const [phase, setPhase] = useState('idle') // 'idle' | 'preview' | 'processing'
  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [error, setError] = useState(null)

  const cameraRef = useRef(null)
  const galleryRef = useRef(null)

  // Revoke the object URL when it changes or on unmount.
  useEffect(() => {
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }
  }, [previewUrl])

  function pickFile(e) {
    const f = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!f) return
    setError(null)
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setPhase('preview')
  }

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setFile(null)
    setError(null)
    setPhase('idle')
  }

  async function useThisPhoto() {
    setPhase('processing')
    try {
      const base64 = await processImage(file)
      if (base64.length > MAX_BASE64_LEN) {
        setError('This image is too large. Please try a closer, clearer photo.')
        backToIdle()
        return
      }
      onCaptureComplete({ imageBase64: base64, mimeType: 'image/jpeg', fileName: file?.name || '' })
    } catch {
      setError('Something went wrong reading the image. Please try again.')
      backToIdle()
    }
  }

  function backToIdle() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setFile(null)
    setPhase('idle')
  }

  const bigBtn =
    'flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-lg font-semibold'

  return (
    <div className="mb-6 rounded-2xl border-2 border-dashed border-[var(--color-primary)]/40 bg-white p-4">
      {/* Hidden inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={pickFile}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={pickFile}
      />

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-base text-[var(--color-danger)]">
          {error}
        </p>
      )}

      {phase === 'idle' && (
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className={`${bigBtn} bg-[var(--color-primary)] text-white`}
            >
              📷 Take a photo
            </button>
            <button
              type="button"
              onClick={() => galleryRef.current?.click()}
              className={`${bigBtn} border-2 border-[var(--color-primary)] bg-white text-[var(--color-primary)]`}
            >
              🖼️ Choose from gallery
            </button>
          </div>
          <p className="text-center text-base text-[var(--color-uncertain-text)]">
            Photograph the medicine box, bottle, or blister strip
          </p>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-12 self-center text-base font-semibold text-[var(--color-uncertain-text)] underline"
          >
            Cancel
          </button>
        </div>
      )}

      {(phase === 'preview' || phase === 'processing') && (
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <img
              src={previewUrl}
              alt="Selected medicine"
              className={`max-w-[300px] rounded-xl shadow-md ${phase === 'processing' ? 'opacity-50' : ''}`}
            />
            {phase === 'processing' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-[var(--color-primary)]" />
                <span className="text-base font-semibold text-[var(--color-primary)]">Preparing image…</span>
              </div>
            )}
          </div>

          {phase === 'preview' && (
            <div className="flex w-full flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={useThisPhoto}
                className={`${bigBtn} bg-[var(--color-primary)] text-white`}
              >
                ✓ Use this photo
              </button>
              <button
                type="button"
                onClick={retake}
                className={`${bigBtn} border-2 border-slate-300 bg-white text-[var(--color-text)]`}
              >
                ↻ Retake
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
