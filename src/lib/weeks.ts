import { addDays, format, getDay, parseISO, subDays } from 'date-fns'

/** The YYYY-MM-DD of the pay-week start containing `date`.
 * weekStartDay: 0=Sun..6=Sat. */
export function payWeekStart(date: string, weekStartDay: number): string {
  const d = parseISO(date)
  const diff = (getDay(d) - weekStartDay + 7) % 7
  return format(subDays(d, diff), 'yyyy-MM-dd')
}

/** Last day (inclusive) of the pay week starting at `weekStart`. */
export function payWeekEnd(weekStart: string): string {
  return format(addDays(parseISO(weekStart), 6), 'yyyy-MM-dd')
}

export function formatDay(date: string): string {
  return format(parseISO(date), 'EEE d MMM')
}

export function formatWeekRange(weekStart: string): string {
  const start = parseISO(weekStart)
  const end = addDays(start, 6)
  return `${format(start, 'd MMM')} – ${format(end, 'd MMM')}`
}

export function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd')
}
