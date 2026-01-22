import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Factsheet Editor',
  description: 'WSU Factsheet Editor - WordPress export processor',
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
