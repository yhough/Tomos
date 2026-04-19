import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Grimoire',
    template: '%s — Grimoire',
  },
  description: 'AI-powered worldbuilding companion for writers, game designers, and storytellers.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body
        className="antialiased min-h-screen bg-background text-foreground"
      >
        {children}
      </body>
    </html>
  )
}
