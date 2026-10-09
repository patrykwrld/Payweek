import { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { useAuth } from './auth/AuthProvider'
import { SignIn } from './auth/SignIn'
import { ResetPassword } from './auth/ResetPassword'
import { REPLAY_EVENT, hasSeenIntro } from './lib/intro'
import { Shell } from './components/Shell'
import { QuickAdd } from './screens/QuickAdd'

/**
 * Everything except the screen you land on is fetched when you first go
 * there.
 *
 * The whole app used to arrive in one 580KB file before anything rendered,
 * which is a long time to look at nothing on a £90 Android in a warehouse
 * with one bar of signal. Sign-in and the Week screen are what somebody sees
 * first, so they stay in the main bundle; the rate forms, the agency screens
 * and Setup are several hundred lines each that most sessions never open.
 *
 * Each one arrives as its own file the first time it is needed, then it is
 * cached — by the browser, and by the service worker after that.
 */
const Agencies = lazy(() => import('./screens/Agencies').then((m) => ({ default: m.Agencies })))
const AgencyDetail = lazy(() => import('./screens/AgencyDetail').then((m) => ({ default: m.AgencyDetail })))
const AgencyNew = lazy(() => import('./screens/AgencyNew').then((m) => ({ default: m.AgencyNew })))
const Payday = lazy(() => import('./screens/Payday').then((m) => ({ default: m.Payday })))
const PayslipCheck = lazy(() => import('./screens/PayslipCheck').then((m) => ({ default: m.PayslipCheck })))
const RuleForm = lazy(() => import('./screens/RuleForm').then((m) => ({ default: m.RuleForm })))
const ShiftDetail = lazy(() => import('./screens/ShiftDetail').then((m) => ({ default: m.ShiftDetail })))
const Settings = lazy(() => import('./screens/Settings').then((m) => ({ default: m.Settings })))
const Shifts = lazy(() => import('./screens/Shifts').then((m) => ({ default: m.Shifts })))
// Shown once each, and one of them is a full-screen animation.
const Intro = lazy(() => import('./components/Intro').then((m) => ({ default: m.Intro })))
const MoneyRain = lazy(() => import('./components/MoneyRain').then((m) => ({ default: m.MoneyRain })))

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
  // Otherwise someone arriving from the email lands on the Week screen with no
  // sign a reset was in progress, and their old password still works.
  if (recovering) return <ResetPassword onDone={finishRecovery} />

  // Arriving from the confirmation link. This is the one moment in the app
  // worth making a fuss of, and it comes before the intro so the fuss is the
  // first thing they see rather than the fifth.
  if (celebrating) {
    return (
      <Suspense fallback={null}>
        <MoneyRain
        username={
          (session.user.user_metadata as { username?: string } | null)
            ?.username ?? null
        }
          onDone={finishCelebration}
        />
      </Suspense>
    )
  }

  // After sign-in, not before: someone who hasn't decided to use Payweek yet
  // shouldn't be read four cards about it.
  if (!introDone) {
    return (
      <Suspense fallback={null}>
        <Intro onDone={() => setIntroDone(true)} />
      </Suspense>
    )
  }

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
