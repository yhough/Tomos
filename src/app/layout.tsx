import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Playfair_Display } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  style: ['italic'],
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  title: {
    default: 'Grimm',
    template: '%s — Grimm',
  },
  description: 'AI-powered writing companion for novelists and long-form writers.',
}

// Runs before React hydrates — prevents flash of wrong theme
const themeScript = `(function(){try{var t=localStorage.getItem('grimm-theme');if(t==='dark')document.documentElement.classList.add('dark');}catch(e){}})()`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} ${playfair.variable} font-sans antialiased min-h-screen bg-background text-foreground`}
      >
        {children}
      </body>
    </html>
  )
}
