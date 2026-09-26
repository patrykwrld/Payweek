// Captures a real screen out of the running app (src/shots.tsx) so graphics
// are built from the thing itself rather than a mock-up of it. Shared by the
// story frames and the email hero.
//
// `focus` names the element the graphic is actually about. Callers show a
// window onto part of a 768px screen, and the payoff is often nowhere near
// the top, so rather than hard-coding offsets that rot the moment a screen
// gains a row, measure where that element sits and report it back.
import { readFileSync, mkdirSync } from 'node:fs'

export const APP_W = 432
export const APP_H = 768
const PAD = 20 // app px of breathing room above the focused element

export async function appShot(
  browser,
  { screen, file, dir, act, focus, width },
) {
  mkdirSync(dir, { recursive: true })
  const p = await browser.newPage({
    viewport: { width: APP_W, height: APP_H },
    deviceScaleFactor: 3,
  })
  // Pin the clock so "this week" is the same week every run.
  await p.clock.setFixedTime(new Date('2026-03-07T18:30:00'))
  await p.goto(`http://localhost:5199/shots.html?s=${screen}`, { waitUntil: 'load' })
  await p.waitForTimeout(2200)
  if (act) await act(p)

  let y = 0
  if (focus) {
    const box = await focus(p).first().boundingBox().catch(() => null)
    if (box) y = Math.max(0, box.y - PAD)
    else console.warn(`${screen}: focus not found, showing the top of the screen`)
  }
  const path = `${dir}/${file}.png`
  await p.screenshot({ path })
  await p.close()

  return {
    src: `data:image/png;base64,${readFileSync(path).toString('base64')}`,
    top: -Math.round(y * ((width ?? APP_W) / APP_W)),
  }
}

// The three screens worth showing, and where the payoff sits on each.
export const SCREENS = {
  // Skip the app's own wordmark — graphics carry one directly above it, and
  // two in a row looks like a mistake.
  week: { screen: 'week', focus: (p) => p.getByText(/this pay week/i) },
  payday: { screen: 'payday', focus: (p) => p.locator('main :is(h2,h3)') },
  // The £30 only exists once a payslip figure is entered, and the verdict is
  // below the form, so focus on it.
  check: {
    screen: 'check',
    focus: (p) => p.getByText(/short/i),
    act: async (p) => {
      await p.locator('select').nth(1).selectOption({ index: 1 })
      await p.waitForTimeout(500)
      await p.locator('main input').first().fill('437.53')
      await p.waitForTimeout(1200)
    },
  },
}
