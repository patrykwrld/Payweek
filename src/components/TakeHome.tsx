import { useState } from 'react'
import { formatPence } from '../lib/money'
import {
  estimateTakeHome,
  STUDENT_LOAN_LABEL,
  type Extras,
  type PayCycle,
  type ParsedTaxCode,
  type StudentLoanPlan,
} from '../lib/tax'

/**
 * What a period is likely to be worth after tax and National Insurance.
 *
 * The single most-requested thing from the closed test — people want the
 * number that lands in the bank, not the number the shifts were worth. It
 * is deliberately quieter than the gross figure above it and says
 * "estimate" in as many words, because one of these two numbers is a fact
 * and the other is not:
 *
 *   NI is exact. It is worked out on each pay period alone and never
 *   reconciled, so this is the figure on the payslip.
 *
 *   Income tax is an estimate on the Week 1 basis — this period's pay
 *   against this period's slice of the allowance, carrying nothing in
 *   from the rest of the year. Right on the nose for anyone whose code
 *   ends W1, M1 or X; close in a steady week and out in an odd one for
 *   everybody else.
 *
 * Tapping it opens the breakdown, because "£427.76" invites exactly one
 * question and the answer should not be a support email.
 */
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

  // Nothing deducted is worth saying plainly rather than showing a
  // breakdown of zeroes.
  if (t.taxPence === 0 && t.niPence === 0 && t.studentLoanPence === 0 && t.pensionPence === 0) {
    return (
      <p className="mt-1 font-mono text-[12.5px] text-faint">
        under the tax and NI thresholds — all yours
      </p>
    )
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="press -my-1 flex min-h-[24px] items-baseline gap-1.5 py-1 text-left font-mono text-[12.5px] text-muted"
      >
        <span>
          ≈ <span className="font-[650] text-ink">{formatPence(t.netPence)}</span> after{' '}
          {/* Naming the two everybody knows is clearer than "deductions"
              — but only while they are the only two. */}
          {t.studentLoanPence > 0 || t.pensionPence > 0 ? 'deductions' : 'tax & NI'}
        </span>
        <span aria-hidden className="text-faint">
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open && (
        <dl className="mt-1.5 space-y-1 rounded-xl border border-edge bg-void/40 px-3 py-2.5 font-mono text-[12px]">
          <Row label="Gross" value={formatPence(t.grossPence)} />
          {t.bands.map((band, i) => (
            <Row
              key={`${band.label}-${i}`}
              // "Basic rate" on its own is a trap in this app, where every
              // other "rate" is pounds an hour. When there is only one band
              // there is nothing to distinguish, so say what it actually is.
              label={
                t.bands.length === 1
                  ? `Income tax ${band.percent}%`
                  : `${band.label} ${band.percent}%`
              }
              value={`−${formatPence(band.taxPence)}`}
              dim
            />
          ))}
          {t.taxPence > 0 && t.bands.length > 1 && (
            <Row label="Income tax" value={`−${formatPence(t.taxPence)}`} />
          )}
          <Row label="National Insurance" value={`−${formatPence(t.niPence)}`} />
          {t.studentLoanPence > 0 && (
            <Row
              label={studentLoanLabel(extras)}
              value={`−${formatPence(t.studentLoanPence)}`}
            />
          )}
          {t.pensionPence > 0 && (
            <Row label={pensionLabel(extras)} value={`−${formatPence(t.pensionPence)}`} />
          )}
          <div className="!mt-2 flex items-baseline justify-between border-t border-edge pt-2">
            <dt className="font-sans font-semibold">Take-home</dt>
            <dd className="font-[650] text-ink">{formatPence(t.netPence)}</dd>
          </div>
          <p className="!mt-2 font-sans text-[11px] leading-snug text-faint">
            NI{t.studentLoanPence > 0 ? ' and the loan are' : ' is'} exact. The
            tax is an estimate on your code
            {t.region === 'scotland' ? ' at Scottish rates' : ''} — it
            can&rsquo;t know about other jobs or what you&rsquo;ve already paid
            this year. Always check your payslip.
          </p>
        </dl>
      )}
    </div>
  )
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

function Row({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={dim ? 'text-faint' : 'text-muted'}>{label}</dt>
      <dd className={dim ? 'text-faint' : 'text-muted'}>{value}</dd>
    </div>
  )
}
