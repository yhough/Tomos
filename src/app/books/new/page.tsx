'use client'

import { GENRES } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function NewBookPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    title: '',
    genre: 'Fantasy',
    premise: '',
    protagonist_name: '',
    protagonist_description: '',
  })

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    setError('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required.'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      const book = await res.json()
      router.push(`/books/${book.id}`)
    } catch {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border px-6 h-14 flex items-center">
        <Link href="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={14} />
          Back
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">New Book</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Tell Grimoire what you're working on and it will build your workspace from there.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="The Ashen Throne"
                autoFocus
                className="px-3 py-2 rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>

            {/* Genre */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">Genre</label>
              <select
                value={form.genre}
                onChange={(e) => set('genre', e.target.value)}
                className="px-3 py-2 rounded-md border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              >
                {GENRES.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            {/* Premise */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium">
                Premise <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <textarea
                value={form.premise}
                onChange={(e) => set('premise', e.target.value)}
                placeholder="What is this story about? 1–3 sentences."
                rows={3}
                className="px-3 py-2 rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring text-sm resize-none"
              />
            </div>

            {/* Protagonist */}
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">
                Protagonist <span className="text-muted-foreground font-normal">(optional)</span>
              </p>
              <input
                type="text"
                value={form.protagonist_name}
                onChange={(e) => set('protagonist_name', e.target.value)}
                placeholder="Name"
                className="px-3 py-2 rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
              <input
                type="text"
                value={form.protagonist_description}
                onChange={(e) => set('protagonist_description', e.target.value)}
                placeholder="One-line description"
                className="px-3 py-2 rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring text-sm"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3 pt-1">
              <Link
                href="/"
                className="flex-1 px-4 py-2 rounded-md border border-border text-sm text-center hover:bg-muted transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                {loading ? 'Creating...' : 'Create Book'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
