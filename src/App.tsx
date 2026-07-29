import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import { SignIn } from './auth/SignIn'
import { Shell } from './components/Shell'
import { Agencies } from './screens/Agencies'
import { AgencyDetail } from './screens/AgencyDetail'
import { AgencyNew } from './screens/AgencyNew'
import { QuickAdd } from './screens/QuickAdd'
import { RuleForm } from './screens/RuleForm'
import { ShiftDetail } from './screens/ShiftDetail'
import { Shifts } from './screens/Shifts'

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

  if (!session) return <SignIn />

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<QuickAdd />} />
          <Route path="/shifts" element={<Shifts />} />
          <Route path="/shifts/:id" element={<ShiftDetail />} />
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
