import { useAuth } from './auth/AuthProvider'
import { SignIn } from './auth/SignIn'
import { Home } from './screens/Home'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-2xl font-extrabold tracking-tight text-muted">
          Payweek<span className="text-accent">.</span>
        </p>
      </main>
    )
  }

  return session ? <Home /> : <SignIn />
}
