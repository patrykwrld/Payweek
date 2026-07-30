/** Tab-bar icons. Deliberately plain 24px line art on `currentColor` so they
 * inherit the active/inactive tab colour and stay legible at 20px. */

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

function Svg({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-6" {...stroke}>
      {children}
    </svg>
  )
}

export function PlusIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8.5v7M8.5 12h7" />
    </Svg>
  )
}

export function ListIcon() {
  return (
    <Svg>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </Svg>
  )
}

export function WalletIcon() {
  return (
    <Svg>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H17a2 2 0 0 1 2 2v1" />
      <rect x="3" y="7.5" width="18" height="12" rx="2.5" />
      <path d="M16 13.5h.01" />
    </Svg>
  )
}

export function RatesIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 15l6-6" />
      <path d="M9.5 9.5h.01M14.5 14.5h.01" />
    </Svg>
  )
}

export function GearIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.2M12 18.8V21M4.2 7.5l1.9 1.1M17.9 15.4l1.9 1.1M4.2 16.5l1.9-1.1M17.9 8.6l1.9-1.1" />
    </Svg>
  )
}
