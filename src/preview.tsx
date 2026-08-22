// Throwaway: renders the reworked pieces against mock data so they can be
// looked at without a backend. Deleted once the pass is reviewed.
import { createRoot } from 'react-dom/client'
import './index.css'
import { WeekHero } from './components/WeekHero'
import { RateBands, RateBandsLegend } from './components/ui'
import type { WeekPulse } from './lib/weekPulse'

const week = ['2026-03-02','2026-03-03','2026-03-04','2026-03-05','2026-03-06','2026-03-07','2026-03-08']
const money = [10280, 11963, 0, 14850, 17679, 12627, 0]
const TODAY = '2026-03-07'

const pulse: WeekPulse = {
  grossPence: money.reduce((a, b) => a + b, 0),
  paidMinutes: 42 * 60 + 15,
  shiftCount: 5,
  previousGrossPence: 53000,
  dayOfWeek: 6,
  weekEnd: '2026-03-08',
  paydayDate: '2026-03-13',
  daysToPayday: 5,
  perDay: week.map((date, i) => ({
    date,
    pence: money[i] ?? 0,
    isToday: date === TODAY,
    isFuture: date > TODAY,
  })),
}

createRoot(document.getElementById('root')!).render(
  <div className="mx-auto max-w-[402px] space-y-6 p-5">
    <WeekHero pulse={pulse} />

    <div>
      <header className="mb-2 flex items-baseline justify-between gap-2.5 py-2">
        <h2 className="text-[13px] font-semibold text-muted">2 – 8 Mar</h2>
        <p className="font-mono text-[13px] text-muted">
          42h 15m · <span className="font-semibold text-ink">£673.99</span>
        </p>
      </header>
      <div className="card-raised overflow-hidden rounded-[20px] border border-edge bg-surface">
        {[
          { day: 'Sat 7 Mar', sub: 'Meridian Staffing · 08:00–18:00', gross: '£126.27', hours: '9h',
            bd: [{ label: 'Base rate', minutes: 540, ratePence: 1350, subtotalPence: 12150 }] },
          { day: 'Fri 6 Mar', sub: 'Meridian Staffing · 22:00–06:00', gross: '£176.79', hours: '7.5h',
            bd: [{ label: 'Base rate', minutes: 120, ratePence: 1350, subtotalPence: 2700 },
                 { label: 'Night rate', minutes: 330, ratePence: 1620, subtotalPence: 8910 }] },
          { day: 'Thu 5 Mar', sub: 'Northgate Logistics · 07:00–17:00', gross: '£148.50', hours: '9.25h',
            bd: [{ label: 'Base rate', minutes: 555, ratePence: 1200, subtotalPence: 11100 }] },
        ].map((r, i) => (
          <div key={r.day} className={`block w-full px-3.5 pb-3 pt-[13px] text-left ${i > 0 ? 'border-t border-edge' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{r.day}</p>
                <p className="truncate text-sm text-muted">{r.sub}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono font-semibold">{r.gross}</p>
                <p className="font-mono text-sm text-muted">{r.hours}</p>
              </div>
            </div>
            <div className="mt-[9px]">
              <RateBands breakdown={r.bd} paidMinutes={r.bd.reduce((t, b) => t + b.minutes, 0)} />
            </div>
          </div>
        ))}
      </div>
      <RateBandsLegend />
    </div>
  </div>,
)
