import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Lora } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const lora = Lora({
  subsets: ['latin'],
  style: ['italic'],
  variable: '--font-playfair',
})

export const metadata: Metadata = {
  title: {
    default: 'Tomos',
    template: '%s — Tomos',
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
        className={`${GeistSans.variable} ${GeistMono.variable} ${lora.variable} font-sans antialiased min-h-screen bg-background text-foreground`}
      >
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'hsl(var(--card))',
              color: 'hsl(var(--foreground))',
              border: '0.5px solid hsl(var(--border))',
              fontSize: 13,
            },
          }}
        />
      </body>
    </html>
  )
}
