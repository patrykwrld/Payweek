import { useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { useAuth } from './auth/AuthProvider'
import { SignIn } from './auth/SignIn'
import { ResetPassword } from './auth/ResetPassword'
import { MoneyRain } from './components/MoneyRain'
import { Intro } from './components/Intro'
import { REPLAY_EVENT, hasSeenIntro } from './lib/intro'
import { Shell } from './components/Shell'
import { Agencies } from './screens/Agencies'
import { AgencyDetail } from './screens/AgencyDetail'
import { AgencyNew } from './screens/AgencyNew'
import { Payday } from './screens/Payday'
import { PayslipCheck } from './screens/PayslipCheck'
import { QuickAdd } from './screens/QuickAdd'
import { RuleForm } from './screens/RuleForm'
import { ShiftDetail } from './screens/ShiftDetail'
import { Settings } from './screens/Settings'
import { Shifts } from './screens/Shifts'

export default function App() {
  const { session, loading, recovering, finishRecovery, celebrating, finishCelebration } =
    useAuth()
  // Read once, so dismissing it doesn't need a reload and reopening it from
  // Settings works without one either.
  const [introDone, setIntroDone] = useState(hasSeenIntro)

  useEffect(() => {
    const replay = () => setIntroDone(false)
    window.addEventListener(REPLAY_EVENT, replay)
    return () => window.removeEventListener(REPLAY_EVENT, replay)
  }, [])

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center">
        <p className="text-2xl font-semibold tracking-tight text-muted">
          Payweek<span className="text-accent">.</span>
        </p>
      </main>
    )
  }

  if (!session) return <SignIn />

  // A reset link signs you in for real, so this has to come before the app.
  // Otherwise someone arriving from the email lands on the Add screen with no
  // sign a reset was in progress, and their old password still works.
  if (recovering) return <ResetPassword onDone={finishRecovery} />

  // Arriving from the confirmation link. This is the one moment in the app
  // worth making a fuss of, and it comes before the intro so the fuss is the
  // first thing they see rather than the fifth.
  if (celebrating) {
    return (
      <MoneyRain
        username={
          (session.user.user_metadata as { username?: string } | null)
            ?.username ?? null
        }
        onDone={finishCelebration}
      />
    )
  }

  // After sign-in, not before: someone who hasn't decided to use Payweek yet
  // shouldn't be read four cards about it.
  if (!introDone) return <Intro onDone={() => setIntroDone(true)} />

  return (
    // On the web the app lives under /app, because payweek.app itself is now
    // the marketing page. Android serves from the root of its own bundle and
    // must stay there, so the basename is platform-dependent rather than a
    // constant. Getting this wrong sends the nav's home tab to the landing
    // page instead of Add a shift.
    <BrowserRouter basename={Capacitor.isNativePlatform() ? undefined : '/app'}>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<QuickAdd />} />
          <Route path="/shifts" element={<Shifts />} />
          <Route path="/shifts/:id" element={<ShiftDetail />} />
          <Route path="/payday" element={<Payday />} />
          <Route path="/check" element={<PayslipCheck />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/agencies" element={<Agencies />} />
          <Route path="/agencies/new" element={<AgencyNew />} />
          <Route path="/agencies/:id" element={<AgencyDetail />} />
          <Route path="/agencies/:id/rules/new" element={<RuleForm />} />
          <Route path="/agencies/:id/rules/:ruleId" element={<RuleForm />} />
          <Route path="*" element={<QuickAdd />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
