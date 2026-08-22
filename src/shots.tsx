// Throwaway, dev-server only: renders the real screens against sample data so
// marketing screenshots come from the actual components rather than a mock-up
// of them. If a screen changes, the next shot changes with it.
//
// The data goes in through TanStack's cache under the same keys the app uses,
// so useAppData resolves to `ready` without a backend and every figure on
// screen is the rate engine's own arithmetic, not a number typed into a
// fixture. Refetching is off, or the primed cache would be thrown away the
// moment the queries fail.
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import './index.css'
import { Shell } from './components/Shell'
import { Payday } from './screens/Payday'
import { PayslipCheck } from './screens/PayslipCheck'
import { QuickAdd } from './screens/QuickAdd'
import { Shifts } from './screens/Shifts'
import type { Tables } from './lib/database.types'
import { todayISO } from './lib/weeks'

const USER = '00000000-0000-0000-0000-000000000001'
const MERIDIAN = '10000000-0000-0000-0000-000000000001'
const NORTHGATE = '10000000-0000-0000-0000-000000000002'

const thisWeek = format(
  startOfWeek(parseISO(todayISO()), { weekStartsOn: 1 }),
  'yyyy-MM-dd',
)
const day = (offset: number) =>
  format(addDays(parseISO(thisWeek), offset), 'yyyy-MM-dd')

const agencies: Tables<'agencies'>[] = [
  {
    id: MERIDIAN,
    user_id: USER,
    name: 'Meridian Staffing',
    base_rate_pence: 1350,
    pay_cycle: 'weekly',
    pay_week_start_day: 1,
    pay_delay_days: 5,
    archived: false,
    notes: null,
    created_at: `${thisWeek}T09:00:00Z`,
  },
  {
    id: NORTHGATE,
    user_id: USER,
    name: 'Northgate Logistics',
    base_rate_pence: 1200,
    pay_cycle: 'weekly',
    pay_week_start_day: 1,
    pay_delay_days: 5,
    archived: false,
    notes: null,
    created_at: `${thisWeek}T09:00:00Z`,
  },
]

const rule = (
  id: string,
  agency_id: string,
  label: string,
  band_start: string,
  band_end: string,
  rate_pence: number,
  days_of_week: number[] | null,
  priority: number,
): Tables<'rate_rules'> => ({
  id,
  agency_id,
  kind: 'time_band',
  label,
  band_start,
  band_end,
  rate_pence,
  multiplier: null,
  days_of_week,
  threshold_minutes: null,
  threshold_scope: null,
  priority,
  active: true,
  created_at: `${thisWeek}T09:00:00Z`,
})

const rules: Tables<'rate_rules'>[] = [
  rule('r1', MERIDIAN, 'Night rate', '22:00', '06:00', 1620, null, 20),
  rule('r2', MERIDIAN, 'Weekend rate', '06:00', '22:00', 1755, [0, 6], 10),
  rule('r3', NORTHGATE, 'Night rate', '22:00', '06:00', 1440, null, 20),
]

const shift = (
  id: string,
  agency_id: string,
  date: string,
  start_time: string,
  end_time: string,
  break_minutes = 30,
): Tables<'shifts'> => ({
  id,
  user_id: USER,
  agency_id,
  date,
  start_time: `${start_time}:00`,
  end_time: `${end_time}:00`,
  break_minutes,
  breaks: break_minutes > 0 ? [{ minutes: break_minutes }] : [],
  manual_rate_pence: null,
  notes: null,
  created_at: `${date}T09:00:00Z`,
})

// This week, deliberately uneven: two heavy nights, a Wednesday off, a big
// Saturday. A tidy ramp would make the week bars look like a chart nobody's
// week actually produces.
const shifts: Tables<'shifts'>[] = [
  shift('s7', MERIDIAN, day(5), '08:00', '18:00'),
  shift('s6', MERIDIAN, day(4), '18:00', '02:00'),
  shift('s5', NORTHGATE, day(3), '07:00', '17:00', 45),
  shift('s3', MERIDIAN, day(1), '17:00', '02:00'),
  shift('s2', MERIDIAN, day(0), '06:00', '14:30'),
  // Last week, so the hero has something to compare against and Payday has a
  // settled week above the one in progress.
  shift('p4', MERIDIAN, day(-2), '18:00', '02:00'),
  shift('p3', MERIDIAN, day(-3), '06:00', '14:30'),
  shift('p2', MERIDIAN, day(-4), '06:00', '14:30'),
  shift('p1', MERIDIAN, day(-6), '17:00', '02:00'),
]

const profile: Tables<'profiles'> = {
  id: USER,
  username: 'patryk',
  display_name: null,
  currency: 'GBP',
  holiday_accrual_pct: 12.07,
  show_holiday_accrual: true,
  week_starts_on: 1,
  created_at: `${thisWeek}T09:00:00Z`,
}

// Short by £30, which is the story the landing page tells.
const payslips: Tables<'payslips'>[] = [
  {
    id: 'ps1',
    user_id: USER,
    agency_id: MERIDIAN,
    period_start: day(-7),
    period_end: day(-1),
    gross_pence: 43753,
    net_pence: null,
    created_at: `${day(-1)}T09:00:00Z`,
  },
]

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
})
client.setQueryData(['agencies'], agencies)
client.setQueryData(['rate_rules'], rules)
client.setQueryData(['shifts'], shifts)
client.setQueryData(['profiles'], profile)
client.setQueryData(['payslips'], payslips)

const screen = new URLSearchParams(location.search).get('s') ?? 'week'
const path =
  screen === 'shifts'
    ? '/shifts'
    : screen === 'payday'
    ? '/payday'
    : screen === 'check'
    ? '/check'
    : '/'

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={client}>
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<QuickAdd />} />
          <Route path="/shifts" element={<Shifts />} />
          <Route path="/payday" element={<Payday />} />
          <Route path="/check" element={<PayslipCheck />} />
        </Route>
      </Routes>
    </MemoryRouter>
  </QueryClientProvider>,
)
