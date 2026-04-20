'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Eye, EyeOff, Sparkles } from 'lucide-react'

const inputCls =
  'px-3 py-2 rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring text-sm w-full transition-colors'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError('Name is required.'); return }
    if (!email.trim()) { setError('Email is required.'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    setError('')
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    router.push('/')
  }

  function clearError() { if (error) setError('') }

  return (
    <div className="min-h-screen flex bg-background">

      {/* ── Left panel — branding ── */}
      <aside className="hidden lg:flex w-[420px] shrink-0 flex-col justify-between bg-card border-r border-border px-12 py-14">
        <div className="flex items-center gap-2.5">
          <Sparkles size={17} className="text-primary" />
          <span className="text-[26px] text-foreground leading-none" style={{ fontFamily: 'Lumos' }}>
            Grimm
          </span>
        </div>

        <div>
          <p
            className="text-[22px] leading-snug text-foreground"
            style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic' }}
          >
            "A writer's greatest fear is forgetting what they already built."
          </p>
          <p className="text-sm text-muted-foreground mt-5 leading-relaxed">
            Grimm remembers everything — so you don't have to. Start writing and let the world take care of itself.
          </p>
        </div>

        <div className="flex flex-col gap-3.5">
          {[
            'Free to start, no credit card',
            'Unlimited lore & character entries',
            'AI-powered continuity checking',
            'Full timeline of your story',
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

        <div className="flex items-center gap-2 mb-10 lg:hidden">
          <Sparkles size={15} className="text-primary" />
          <span className="text-2xl text-foreground" style={{ fontFamily: 'Lumos' }}>Grimm</span>
        </div>

        <div className="w-full max-w-sm">

          <div className="mb-7">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Create your account
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Start building your world today.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>

            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => { setName(e.target.value); clearError() }}
                placeholder="Your name"
                autoComplete="name"
                autoFocus
                className={inputCls}
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError() }}
                placeholder="you@example.com"
                autoComplete="email"
                className={inputCls}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-foreground">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError() }}
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
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
              {password.length > 0 && (
                <PasswordStrength password={password} />
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive -mt-1">{error}</p>
            )}

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
                  Creating account…
                </span>
              ) : 'Create account'}
            </button>

            <p className="text-xs text-muted-foreground text-center -mt-1">
              By signing up you agree to our{' '}
              <Link href="/terms" className="underline underline-offset-3 hover:text-foreground transition-colors">
                Terms
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="underline underline-offset-3 hover:text-foreground transition-colors">
                Privacy Policy
              </Link>.
            </p>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground select-none">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* Google */}
          <button
            onClick={() => {}}
            className="flex items-center justify-center gap-2.5 w-full px-4 py-2 rounded-md border border-border bg-card text-sm text-foreground hover:bg-muted transition-colors"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <p className="text-sm text-muted-foreground text-center mt-7">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-foreground font-medium hover:text-primary transition-colors underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>

        </div>
      </div>
    </div>
  )
}

// ── Password strength indicator ────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ]
  const score = checks.filter(Boolean).length

  const label = score <= 1 ? 'Weak' : score === 2 ? 'Fair' : score === 3 ? 'Good' : 'Strong'
  const color =
    score <= 1
      ? 'bg-destructive'
      : score === 2
      ? 'bg-yellow-500'
      : score === 3
      ? 'bg-primary/70'
      : 'bg-green-500'

  return (
    <div className="flex items-center gap-2 mt-0.5">
      <div className="flex gap-1 flex-1">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className={`h-1 flex-1 rounded-full transition-colors ${
              n <= score ? color : 'bg-border'
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground w-12 text-right">{label}</span>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}
