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
