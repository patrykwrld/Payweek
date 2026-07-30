import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Last line of defence. Without this, any render-time throw leaves a blank
 * white screen with no way out — on a phone there isn't even a console to
 * look at. A crash must never cost someone their logged shifts, so the
 * recovery offered here reloads rather than clears anything.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // No crash reporting SDK ships with the app (it would change the Play
    // data-safety declaration), so this is the only record of what happened.
    console.error('Payweek crashed:', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-6 px-6 py-12">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Payweek hit a snag
          </h1>
          <p className="text-sm text-muted">
            Nothing you&rsquo;ve logged has been lost — it&rsquo;s saved on this
            device and on the server. Reopening usually clears it.
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.location.reload()}
          className="w-full rounded-lg bg-accent px-4 py-3 text-base font-semibold text-void"
        >
          Reload Payweek
        </button>

        <details className="text-xs text-muted">
          <summary className="cursor-pointer">What went wrong</summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap font-mono">
            {error.message}
          </pre>
        </details>
      </main>
    )
  }
}
