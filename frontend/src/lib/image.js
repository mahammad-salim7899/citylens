// Image helpers.
//
// Phone photos are often 3–8 MB. Storing them raw (as the prototype
// did) overflows browser storage and is slow to upload, so every
// image is downscaled to a sensible size before it goes anywhere.
// EXIF GPS must be read from the ORIGINAL file first — the canvas
// re-encode below strips metadata.

const MAX_DIMENSION = 1280
const JPEG_QUALITY = 0.8

export const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png']
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024

async function loadBitmap(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      /* fall through to <img> decoding */
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e) }
    img.src = url
  })
}

/**
 * Downscale an image File/Blob.
 * @returns {Promise<{dataUrl: string, width: number, height: number}>}
 */
export async function prepareImage(file, maxDim = MAX_DIMENSION) {
  const bmp = await loadBitmap(file)
  const srcW = bmp.width
  const srcH = bmp.height
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH))
  const width = Math.round(srcW * scale)
  const height = Math.round(srcH * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bmp, 0, 0, width, height)
  if (bmp.close) bmp.close()

  return { dataUrl: canvas.toDataURL('image/jpeg', JPEG_QUALITY), width, height }
}

export async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl)
  return res.blob()
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
