import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Outcomes Translation Table Exporter',
  description: 'WSU Outcomes Translation Table Exporter',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}


