import { createClient } from '@supabase/supabase-js'
import { authStorage } from './authStorage'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase project values.',
  )
}

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    flowType: 'pkce',
    // Routes the token to localStorage or sessionStorage depending on whether
    // "Keep me signed in" was ticked. See authStorage.ts.
    storage: authStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
