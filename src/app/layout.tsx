import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RehabTrack | Exercise Monitoring',
  description: 'Real-time monitoring and analysis for back and lower limb rehabilitation exercises.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
