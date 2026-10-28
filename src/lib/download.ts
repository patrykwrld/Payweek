import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

/**
 * Hand a generated file to the user.
 *
 * On the web an anchor with a blob URL is all it takes. Inside the Android
 * WebView that does nothing at all — there is no download manager behind it —
 * so the file is written to the app's cache directory and passed to the system
 * share sheet, which is how a Capacitor app gets a file to Drive, Gmail or
 * Files.
 */
export async function saveTextFile(
  filename: string,
  text: string,
  mimeType: string,
): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    const blob = new Blob([text], { type: `${mimeType};charset=utf-8` })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
    return
  }

  // Cache, not Documents: this is a copy on its way out, and the share sheet
  // is what puts it somewhere permanent.
  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: text,
    directory: Directory.Cache,
    encoding: Encoding.UTF8,
  })
  await Share.share({ title: filename, url: uri })
}

/** Base64 without the `data:image/png;base64,` prefix, which Filesystem rejects. */
function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the image.'))
    reader.onload = () => {
      const result = String(reader.result)
      const comma = result.indexOf(',')
      resolve(comma === -1 ? result : result.slice(comma + 1))
    }
    reader.readAsDataURL(blob)
  })
}

/** Writes a binary file to the cache and hands back its native URI. */
async function cacheBinary(filename: string, blob: Blob): Promise<string> {
  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: await toBase64(blob),
    directory: Directory.Cache,
  })
  return uri
}

/**
 * Put an image into whatever the person wants to put it into.
 *
 * Three different worlds, and the fallback order matters:
 *
 *   Android app      write to cache, hand the URI to the system share sheet.
 *                    Same route as the CSV export.
 *   Mobile browser   navigator.share with a file. Chrome on Android gives
 *                    the real sheet — WhatsApp, Gmail, Drive, Messages —
 *                    which is the whole point of the feature.
 *   Anything else    an anchor with a blob URL, which is a plain download.
 *
 * Returns how it went out, because the UI should not say "shared" when what
 * actually happened was a file landing in Downloads.
 */
export async function shareImageFile(
  filename: string,
  blob: Blob,
  message: string,
): Promise<'shared' | 'downloaded'> {
  if (Capacitor.isNativePlatform()) {
    const uri = await cacheBinary(filename, blob)
    await Share.share({ title: 'My pay week', text: message, url: uri })
    return 'shared'
  }

  const file = new File([blob], filename, { type: blob.type })
  // canShare has to be asked about the file specifically: a browser can
  // support sharing text and still refuse a PNG.
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], text: message })
    return 'shared'
  }

  downloadBlob(filename, blob)
  return 'downloaded'
}

/** Straight to the filesystem, no share sheet. */
export async function saveImageFile(filename: string, blob: Blob): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    // There is no download manager behind the WebView, so "save" is still the
    // share sheet — it is what offers Files and Drive on Android.
    const uri = await cacheBinary(filename, blob)
    await Share.share({ title: filename, url: uri })
    return
  }
  downloadBlob(filename, blob)
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  // Revoking in the same tick cancels the download in Firefox and older
  // WebKit, which have not started reading the blob yet.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
