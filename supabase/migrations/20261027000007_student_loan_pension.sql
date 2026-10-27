-- The other two things that come out of a wage packet.
--
-- Tax and NI alone leave the take-home figure reading HIGH for a large part
-- of this app's audience: agency workers skew young, so student loans are
-- common, and automatic enrolment puts most of them in a pension after
-- twelve weeks on an assignment. Somebody seeing a figure £30 above their
-- payslip concludes the app is broken, which is the opposite of the point.
--
-- All of it is optional and all of it defaults to off, so nobody who has not
-- answered these questions sees a number that assumes an answer.

alter table public.profiles
  add column if not exists student_loan_plan text
    check (student_loan_plan is null
           or student_loan_plan in ('plan1', 'plan2', 'plan4', 'plan5')),
  add column if not exists postgrad_loan bool not null default false,
  add column if not exists pension_percent numeric not null default 0
    check (pension_percent >= 0 and pension_percent <= 100),
  add column if not exists pension_basis text not null default 'qualifying'
    check (pension_basis in ('qualifying', 'gross')),
  add column if not exists pension_relief text not null default 'before_tax'
    check (pension_relief in ('before_tax', 'after_tax', 'salary_sacrifice'));

comment on column public.profiles.student_loan_plan is
  'Repayment plan, or null for none. Plan 3 is the Postgraduate Loan and '
  'lives in postgrad_loan, because it stacks on top of any other plan.';

comment on column public.profiles.pension_percent is
  'Employee contribution. 0 means no pension. The statutory auto-enrolment '
  'minimum is 5% of qualifying earnings.';

comment on column public.profiles.pension_relief is
  'How the contribution is treated: before_tax (net pay arrangement), '
  'after_tax (relief at source), or salary_sacrifice, which also cuts NI.';
