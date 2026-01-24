import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Export Outcomes Translation Tables',
  description: 'Export Outcomes Translation Tables',
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


