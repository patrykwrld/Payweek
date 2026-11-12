import { describe, expect, it } from 'vitest'
import type { Tables } from '../database.types'
import { takeHomeSetup } from './profile'

const profile = (over: Partial<Tables<'profiles'>> = {}): Tables<'profiles'> =>
  ({
    id: 'u',
    username: null,
    display_name: null,
    currency: 'GBP',
    week_starts_on: 1,
    holiday_accrual_pct: 12.07,
    show_holiday_accrual: true,
    tax_code: '1257L',
    show_take_home: true,
    student_loan_plan: null,
    postgrad_loan: false,
    pension_percent: 0,
    pension_basis: 'qualifying',
    pension_relief: 'before_tax',
    created_at: '',
    ...over,
  }) as Tables<'profiles'>

describe('takeHomeSetup', () => {
  it('reads a saved tax code', () => {
    const setup = takeHomeSetup(profile())
    expect(setup?.code.normalised).toBe('1257L')
    expect(setup?.extras.pension).toBeNull()
    expect(setup?.extras.studentLoanPlan).toBeNull()
  })

  // Null means "show gross only", which is what everyone saw before the
  // estimate existed — so every way of not having one has to land there.
  it('has nothing to show without a tax code', () => {
    expect(takeHomeSetup(profile({ tax_code: null }))).toBeNull()
    expect(takeHomeSetup(null)).toBeNull()
    expect(takeHomeSetup(undefined)).toBeNull()
  })

  it('has nothing to show when the estimate is switched off', () => {
    expect(takeHomeSetup(profile({ show_take_home: false }))).toBeNull()
  })

  it('shows nothing rather than guessing at a code it cannot read', () => {
    expect(takeHomeSetup(profile({ tax_code: 'BANANA' }))).toBeNull()
  })

  it('carries the pension and the loan through', () => {
    const setup = takeHomeSetup(
      profile({
        pension_percent: 5,
        pension_relief: 'salary_sacrifice',
        student_loan_plan: 'plan5',
        postgrad_loan: true,
      }),
    )
    expect(setup?.extras.pension).toEqual({
      percent: 5,
      basis: 'qualifying',
      relief: 'salary_sacrifice',
    })
    expect(setup?.extras.studentLoanPlan).toBe('plan5')
    expect(setup?.extras.postgradLoan).toBe(true)
  })

  it('treats a zero pension as no pension', () => {
    expect(takeHomeSetup(profile({ pension_percent: 0 }))?.extras.pension).toBeNull()
  })
})
