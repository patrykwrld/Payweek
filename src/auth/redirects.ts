import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { supabase } from '../lib/supabase'

// Deep-link target registered in AndroidManifest.xml. Must also be listed
// under Supabase Auth > URL Configuration > Redirect URLs.
const NATIVE_CALLBACK = 'payweek://auth-callback'

export function authRedirectUrl(): string {
  return Capacitor.isNativePlatform() ? NATIVE_CALLBACK : window.location.origin
}

/**
 * On Android, magic links and OAuth redirects come back as a deep link
 * (payweek://auth-callback?code=...). Exchange the PKCE code for a session.
 * On web, supabase-js handles the callback itself via detectSessionInUrl.
 */
export function registerAuthDeepLinks(): void {
  if (!Capacitor.isNativePlatform()) return

  void App.addListener('appUrlOpen', ({ url }) => {
    if (!url.startsWith(NATIVE_CALLBACK)) return
    const code = new URL(url).searchParams.get('code')
    if (!code) return
    void supabase.auth.exchangeCodeForSession(code).then(() => {
      // Close the in-app browser tab left over from an OAuth flow, if any.
      void Browser.close().catch(() => undefined)
    })
  })
}
