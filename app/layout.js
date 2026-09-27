import './globals.css'
import { ReduxProvider } from './providers'
export const metadata = {
  title: { default: 'Vertex Trade — A sharper market perspective', template: '%s · Vertex Trade' },
  description:
    'Practice stock-price predictions across Indian and US markets. Explore market data, build a prediction history, and learn with virtual credits.',
  applicationName: 'Vertex Trade',
  icons: { icon: '/icon.svg' },
}
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ReduxProvider>{children}</ReduxProvider>
      </body>
    </html>
  )
}
