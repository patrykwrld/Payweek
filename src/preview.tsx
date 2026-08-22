// Throwaway: renders the reworked pieces against mock data so they can be
// looked at without a backend. Deleted once the pass is reviewed.
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import './index.css'
import { ShiftSheet } from './components/ShiftSheet'
import { WeekHero } from './components/WeekHero'
import {
  Chip,
  ChipRow,
  RateBands,
  RateBandsLegend,
  Sheet,
  SheetHeader,
  Stepper,
} from './components/ui'
import { useState } from 'react'
import type { PricedShift } from './lib/pricing'
import type { WeekPulse } from './lib/weekPulse'

const sample = {
  shift: {
    id: 'demo',
    agency_id: 'a',
    user_id: 'u',
    created_at: '2026-03-06T00:00:00Z',
    date: '2026-03-06',
    start_time: '22:00:00',
    end_time: '06:00:00',
    break_minutes: 30,
    breaks: [{ minutes: 30, start_time: '02:00' }],
    notes: 'Covered the loading bay while Dan was off.',
  },
  pricing: {
    workedMinutes: 480,
    paidMinutes: 450,
    grossPence: 17679,
    breakdown: [
      {
        label: 'Base rate',
        minutes: 120,
        ratePence: 1350,
        subtotalPence: 2700,
      },
      {
        label: 'Night rate',
        minutes: 330,
        ratePence: 1620,
        subtotalPence: 8910,
      },
    ],
  },
  weekStart: '2026-03-02',
} as unknown as PricedShift

function ShiftSheetDemo() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press min-h-[52px] w-full rounded-2xl border border-edge bg-surface text-[15.5px] font-semibold"
      >
        Open a shift
      </button>
      <ShiftSheet
        entry={open ? sample : null}
        agencyName="Meridian Staffing"
        onClose={() => setOpen(false)}
        onDuplicate={() => {}}
        onDelete={() => {}}
      />
    </>
  )
}

const week = [
  '2026-03-02',
  '2026-03-03',
  '2026-03-04',
  '2026-03-05',
  '2026-03-06',
  '2026-03-07',
  '2026-03-08',
]
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

function SheetDemo() {
  const [open, setOpen] = useState(false)
  const [agency, setAgency] = useState('m')
  const [brk, setBrk] = useState(30)
  const [start, setStart] = useState('18:00')
  const bump = (v: string, d: number) => {
    const m =
      (Number(v.slice(0, 2)) * 60 + Number(v.slice(3)) + d + 1440) % 1440
    return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(
      m % 60,
    ).padStart(2, '0')}`
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="press min-h-[52px] w-full rounded-2xl bg-accent text-[15.5px] font-semibold text-void shadow-[0_10px_24px_rgba(94,155,255,0.22)]"
      >
        Add a shift
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Add a shift">
        <SheetHeader title="Add a shift" onClose={() => setOpen(false)} />
        <ChipRow label="Who you worked for">
          <Chip selected={agency === 'm'} onClick={() => setAgency('m')}>
            Meridian Staffing
          </Chip>
          <Chip selected={agency === 'n'} onClick={() => setAgency('n')}>
            Northgate
          </Chip>
        </ChipRow>
        <div className="mb-4 grid grid-cols-2 gap-2.5">
          <Stepper
            label="Started"
            value={start}
            onStep={(d) => setStart(bump(start, d))}
          />
          <Stepper label="Finished" value="02:00" onStep={() => {}} />
        </div>
        <ChipRow label="Unpaid break">
          {[0, 15, 30, 45, 60].map((m) => (
            <Chip key={m} selected={brk === m} onClick={() => setBrk(m)}>
              {m === 0 ? 'none' : `${m}m`}
            </Chip>
          ))}
        </ChipRow>
        <div className="rounded-[18px] border border-edge bg-raised p-3.5">
          <div className="flex items-baseline justify-between gap-2.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-muted">
              This shift pays
            </p>
            <p className="font-mono text-[26px] font-[650] tracking-[-0.03em]">
              £126.27
            </p>
          </div>
        </div>
      </Sheet>
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <MemoryRouter>
    <div className="mx-auto max-w-[402px] space-y-6 p-5">
      <WeekHero pulse={pulse} />

      <SheetDemo />

      <ShiftSheetDemo />

      <div>
        <header className="mb-2 flex items-baseline justify-between gap-2.5 py-2">
          <h2 className="text-[13px] font-semibold text-muted">2 – 8 Mar</h2>
          <p className="font-mono text-[13px] text-muted">
            42h 15m · <span className="font-semibold text-ink">£673.99</span>
          </p>
        </header>
        <div className="card-raised overflow-hidden rounded-[20px] border border-edge bg-surface">
          {[
            {
              day: 'Sat 7 Mar',
              sub: 'Meridian Staffing · 08:00–18:00',
              gross: '£126.27',
              hours: '9h',
              bd: [
                {
                  label: 'Base rate',
                  minutes: 540,
                  ratePence: 1350,
                  subtotalPence: 12150,
                },
              ],
            },
            {
              day: 'Fri 6 Mar',
              sub: 'Meridian Staffing · 22:00–06:00',
              gross: '£176.79',
              hours: '7.5h',
              bd: [
                {
                  label: 'Base rate',
                  minutes: 120,
                  ratePence: 1350,
                  subtotalPence: 2700,
                },
                {
                  label: 'Night rate',
                  minutes: 330,
                  ratePence: 1620,
                  subtotalPence: 8910,
                },
              ],
            },
            {
              day: 'Thu 5 Mar',
              sub: 'Northgate Logistics · 07:00–17:00',
              gross: '£148.50',
              hours: '9.25h',
              bd: [
                {
                  label: 'Base rate',
                  minutes: 555,
                  ratePence: 1200,
                  subtotalPence: 11100,
                },
              ],
            },
          ].map((r, i) => (
            <div
              key={r.day}
              className={`block w-full px-3.5 pb-3 pt-[13px] text-left ${
                i > 0 ? 'border-t border-edge' : ''
              }`}
            >
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
                <RateBands
                  breakdown={r.bd}
                  paidMinutes={r.bd.reduce((t, b) => t + b.minutes, 0)}
                />
              </div>
            </div>
          ))}
        </div>
        <RateBandsLegend />
      </div>
    </div>
  </MemoryRouter>,
)
