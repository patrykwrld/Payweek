import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { consumeResetRequest, consumeSignedUp } from './recoveryFlag'

interface AuthState {
  session: Session | null
  loading: boolean
  /**
   * True between opening a password-reset link and choosing a new password.
   * The link creates a real session, so without this the app would simply
   * open and the reset would be silently abandoned half-done.
   */
  recovering: boolean
  finishRecovery: () => void
  /** True for the one arrival that came from a confirmation link. */
  celebrating: boolean
  finishCelebration: () => void
}

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  recovering: false,
  finishRecovery: () => {},
  celebrating: false,
  finishCelebration: () => {},
})

/**
 * Whether this event is somebody turning up with a session that wasn't there
 * a moment ago.
 *
 * `SIGNED_IN` covers Android, where our own deep-link handler exchanges the
 * code while the app is already running. On the web the confirmation link is
 * a cold page load, and supabase-js does the exchange during start-up — which
 * can surface as `INITIAL_SESSION` instead. Watching only one of the two
 * means the welcome never fires on half the platforms.
 *
 * Deliberately not used for the password-reset flag: a false positive there
 * would demand a new password from somebody who never asked, whereas the
 * worst a false positive here can do is play a nice animation.
 */
function arrived(event: string, session: Session | null): boolean {
  return event === 'SIGNED_IN' || (event === 'INITIAL_SESSION' && session !== null)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [recovering, setRecovering] = useState(false)
  const [celebrating, setCelebrating] = useState(false)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') {
        setRecovering(true)
      } else if (event === 'SIGNED_IN' && consumeResetRequest()) {
        // Android exchanges the reset link with exchangeCodeForSession, which
        // fires an ordinary SIGNED_IN. The local note left when the reset was
        // requested is what tells the two apart. See recoveryFlag.ts.
        setRecovering(true)
      } else if (arrived(event, next) && consumeSignedUp()) {
        // The confirmation link at the end of signing up. Same problem, same
        // answer: by the time the session exists, what the link meant is gone,
        // so the note left when they signed up is what says to celebrate.
        setCelebrating(true)
      }
      // Signing out ends recovery too, so cancelling doesn't leave the flag
      // set for whoever signs in next on this device.
      if (event === 'SIGNED_OUT') {
        setRecovering(false)
        setCelebrating(false)
      }
      setSession(next)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        recovering,
        finishRecovery: () => setRecovering(false),
        celebrating,
        finishCelebration: () => setCelebrating(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext)
}
