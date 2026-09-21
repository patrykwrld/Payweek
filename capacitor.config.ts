import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.payweek',
  appName: 'Payweek',
  webDir: 'dist',
  // Must equal --color-void in src/index.css. This is what Android paints
  // behind the WebView before the first frame; when it drifted from the app's
  // own background you got a flash of a slightly different dark on every cold
  // start.
  backgroundColor: '#0b0f14',
}

export default config
