import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { consumeResetRequest } from './recoveryFlag'

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
}

const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
  recovering: false,
  finishRecovery: () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [recovering, setRecovering] = useState(false)

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      // Android exchanges the reset link with exchangeCodeForSession, which
      // fires an ordinary SIGNED_IN. The local note left when the reset was
      // requested is what tells the two apart. See recoveryFlag.ts.
      if (event === 'SIGNED_IN' && consumeResetRequest()) setRecovering(true)
      // Signing out ends recovery too, so cancelling doesn't leave the flag
      // set for whoever signs in next on this device.
      if (event === 'SIGNED_OUT') setRecovering(false)
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
