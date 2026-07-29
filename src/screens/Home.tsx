import { useAuth } from '../auth/AuthProvider'
import { supabase } from '../lib/supabase'

// Phase 1 placeholder shell — Quick Add lands here in Phase 3.
export function Home() {
  const { session } = useAuth()

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-10 px-6 py-12">
      <header className="flex items-baseline justify-between">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Payweek<span className="text-accent">.</span>
        </h1>
        <button
          type="button"
          onClick={() => void supabase.auth.signOut()}
          className="text-sm text-muted underline underline-offset-4 hover:text-ink"
        >
          Sign out
        </button>
      </header>

      <section className="space-y-2 rounded-2xl border border-edge bg-surface p-6">
        <p className="text-sm text-muted">This pay week</p>
        <p className="font-mono text-5xl font-bold">
          £0<span className="text-muted">.00</span>
        </p>
        <p className="text-sm text-muted">0h logged · shifts arrive in Phase 3</p>
      </section>

      <p className="text-xs text-muted">
        Signed in as{' '}
        <span className="font-mono text-ink">{session?.user.email}</span>
      </p>
    </main>
  )
}
