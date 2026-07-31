const SEEN_KEY = 'payweek-intro-seen'

/** Settings asks for the intro again; App is what actually shows it. */
export const REPLAY_EVENT = 'payweek:replay-intro'

export function hasSeenIntro(): boolean {
  return localStorage.getItem(SEEN_KEY) === '1'
}

export function markIntroSeen(): void {
  localStorage.setItem(SEEN_KEY, '1')
}

export function replayIntro(): void {
  localStorage.removeItem(SEEN_KEY)
  window.dispatchEvent(new Event(REPLAY_EVENT))
}
