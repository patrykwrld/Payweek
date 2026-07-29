/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** Absolute URL of the hosted privacy policy, used by the Android build. */
  readonly VITE_PRIVACY_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
