'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, EyeOff, Sparkles } from 'lucide-react'

const inputCls =
  'px-3 py-2 rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring text-sm w-full transition-colors'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) { setError('Email is required.'); return }
    if (!password.trim()) { setError('Password is required.'); return }
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return }
      router.push('/')
      router.refresh()
    } catch {
      setError('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  function clearError() { if (error) setError('') }

  return (
    <div className="min-h-screen flex bg-background">

      {/* ── Left panel — branding ── */}
      <aside className="hidden lg:flex w-[420px] shrink-0 flex-col justify-between bg-card border-r border-border px-12 py-14">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <Sparkles size={17} className="text-primary" />
          <span className="text-[26px] text-foreground leading-none" style={{ fontFamily: 'Lumos' }}>
            Fief
          </span>
        </div>

        {/* Definition + description */}
        <div>
          <p className="text-xs font-medium tracking-widest text-muted-foreground/60 uppercase mb-3">
            fief
          </p>
          <p
            className="text-[21px] leading-snug text-foreground"
            style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic' }}
          >
            A person's sphere of operation or control.
          </p>
          <p className="text-sm text-muted-foreground mt-5 leading-relaxed">
            Bring your world to life.
          </p>
        </div>

        {/* Feature list */}
        <div className="flex flex-col gap-3.5">
          {[
            'World chat with Claude',
            'Automatic continuity flags',
            'Lore & character tracking',
            "Timeline of your story's history",
          ].map((f) => (
            <div key={f} className="flex items-center gap-3">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
              <span className="text-sm text-muted-foreground">{f}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Right panel — form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">

        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-10 lg:hidden">
          <Sparkles size={15} className="text-primary" />
          <span className="text-2xl text-foreground" style={{ fontFamily: 'Lumos' }}>Fief</span>
        </div>

        <div className="w-full max-w-sm">

          {/* Heading */}
          <div className="mb-7">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Welcome back
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to continue writing.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError() }}
                placeholder="you@example.com"
                autoComplete="email"
                autoFocus
                className={inputCls}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">Password</label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError() }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={`${inputCls} pr-10`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <p className="text-sm text-destructive -mt-1">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center w-full px-4 py-2.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60 mt-1"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          {/* Sign up link */}
          <p className="text-sm text-muted-foreground text-center mt-7">
            Don&apos;t have an account?{' '}
            <Link
              href="/signup"
              className="text-foreground font-medium hover:text-primary transition-colors underline underline-offset-4"
            >
              Sign up
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}
