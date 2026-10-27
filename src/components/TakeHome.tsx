import { useState } from 'react'
import { formatPence } from '../lib/money'
import {
  estimateTakeHome,
  STUDENT_LOAN_LABEL,
  type Extras,
  type PayCycle,
  type ParsedTaxCode,
  type StudentLoanPlan,
  type TakeHome as Estimate,
} from '../lib/tax'

/**
 * Where a pay week actually goes.
 *
 * The first version of this was a table in a box: correct, dense, and it
 * read as a footnote to the gross figure when it is the number people
 * asked for. It also shoved the card's own content — hours, payday, the
 * status chip — most of a screen further down the moment it opened.
 *
 * So it now borrows the language already on the Shifts screen: a striped
 * bar with a named legend, the same idea as the one showing which hours
 * were paid at which rate. The split is legible without tapping anything,
 * and tapping only adds the names and the amounts.
 *
 * What the figures are worth, which the caveat has to keep saying:
 *   NI and student loan are EXACT — both are worked out on the pay period
 *   alone and never reconciled across the year.
 *   Income tax is an ESTIMATE on the Week 1 basis, because the app cannot
 *   see other jobs or the year to date.
 */

interface Slice {
  label: string
  pence: number
  /** A whole literal Tailwind class, so the compiler's scan finds it. */
  className: string
  /** Shown under the legend entry when it is worth saying something. */
  note?: string
}

function slices(t: Estimate, extras: Extras | undefined): Slice[] {
  const out: Slice[] = [
    { label: 'Take-home', pence: t.netPence, className: 'bg-accent' },
  ]
  if (t.pensionPence > 0) {
    out.push({
      label: pensionLabel(extras),
      pence: t.pensionPence,
      // Green, and said out loud in the note: a pension contribution is
      // the one line here that is still the person's own money.
      className: 'bg-positive',
      note: 'still yours — just later',
    })
  }
  if (t.taxPence > 0) {
    out.push({ label: 'Income tax', pence: t.taxPence, className: 'bg-warn' })
  }
  if (t.niPence > 0) {
    out.push({ label: 'National Insurance', pence: t.niPence, className: 'bg-muted' })
  }
  if (t.studentLoanPence > 0) {
    out.push({
      label: studentLoanLabel(extras),
      pence: t.studentLoanPence,
      className: 'bg-negative',
    })
  }
  return out
}

export function TakeHome({
  grossPence,
  code,
  cycle,
  extras,
}: {
  grossPence: number
  code: ParsedTaxCode
  cycle: PayCycle
  extras?: Extras
}) {
  const [open, setOpen] = useState(false)
  if (grossPence <= 0) return null

  const t = estimateTakeHome(grossPence, code, cycle, extras ?? {})
  const taken = t.taxPence + t.niPence + t.studentLoanPence + t.pensionPence

  // Nothing taken is worth one plain line rather than a bar that is all one
  // colour and a legend with a single entry in it.
  if (taken === 0) {
    return (
      <p className="mt-1.5 font-mono text-[12.5px] text-faint">
        under the tax and NI thresholds — all yours
      </p>
    )
  }

  const parts = slices(t, extras)

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="press flex w-full items-baseline gap-2 py-1 text-left"
      >
        <span className="font-mono text-[17px] font-[650] tracking-[-0.02em] text-ink">
          {formatPence(t.netPence)}
        </span>
        <span className="text-[12.5px] text-muted">take-home</span>
        <span className="ml-auto text-[11.5px] font-medium text-accent">
          {open ? 'Hide' : 'Breakdown'}
        </span>
      </button>

      {/* The bar carries nothing the legend does not, so it is decoration to
          a screen reader. Each slice keeps a sliver of width so a £2 student
          loan does not vanish entirely. */}
      <div
        aria-hidden
        className="mt-1 flex h-[7px] gap-[2px] overflow-hidden rounded-full"
      >
        {parts.map((p) => (
          <span
            key={p.label}
            className={`${p.className} min-w-[3px] rounded-full`}
            style={{ flexGrow: p.pence, flexBasis: 0 }}
          />
        ))}
      </div>

      {open && (
        <dl className="mt-2.5 space-y-1.5">
          {parts.map((p) => (
            <div key={p.label} className="flex items-baseline gap-2.5">
              <span
                aria-hidden
                className={`${p.className} mt-[1px] size-2 shrink-0 rounded-[3px]`}
              />
              <dt className="text-[12.5px] text-muted">
                {p.label}
                {p.note && <span className="text-faint"> · {p.note}</span>}
              </dt>
              <dd className="ml-auto font-mono text-[12.5px] text-ink">
                {formatPence(p.pence)}
              </dd>
            </div>
          ))}

          <p className="!mt-2.5 border-t border-edge pt-2 text-[11px] leading-snug text-faint">
            {exactness(t)} The tax is an estimate on your code
            {t.region === 'scotland' ? ' at Scottish rates' : ''} — it can&rsquo;t know
            about other jobs or what you&rsquo;ve paid earlier this year. Check it
            against your payslip.
          </p>
        </dl>
      )}
    </div>
  )
}

/** Which of these figures are facts rather than estimates. */
function exactness(t: Estimate): string {
  if (t.niPence > 0 && t.studentLoanPence > 0) return 'NI and the loan are exact.'
  if (t.studentLoanPence > 0) return 'The loan is exact.'
  if (t.niPence > 0) return 'NI is exact.'
  return ''
}

function studentLoanLabel(extras: Extras | undefined): string {
  const plan = extras?.studentLoanPlan as StudentLoanPlan | null | undefined
  if (plan && extras?.postgradLoan) return `Student loan (${STUDENT_LOAN_LABEL[plan]} + PG)`
  if (plan) return `Student loan (${STUDENT_LOAN_LABEL[plan]})`
  return 'Postgraduate loan'
}

function pensionLabel(extras: Extras | undefined): string {
  const p = extras?.pension
  if (!p) return 'Pension'
  if (p.relief === 'salary_sacrifice') return `Pension ${p.percent}% (sacrifice)`
  return `Pension ${p.percent}%`
}
