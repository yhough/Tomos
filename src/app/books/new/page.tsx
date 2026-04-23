'use client'

import { GENRES } from '@/lib/utils'
import { ArrowLeft, ArrowRight, BookOpen, Plus, Sparkles, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useId, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type CharRow = { _key: string; name: string; role: string; description: string }
type WorldRow = { _key: string; name: string; type: string; summary: string }

const CHARACTER_ROLES = ['protagonist', 'antagonist', 'supporting', 'minor'] as const
const SETTING_TYPES = [
  { value: 'location', label: 'Location' },
  { value: 'faction', label: 'Group / Faction' },
  { value: 'world_fact', label: 'Established Fact' },
  { value: 'misc', label: 'Misc' },
] as const

// ── Step indicator ─────────────────────────────────────────────────────────────

const STEPS = ['The Story', 'Characters', 'The Setting'] as const

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-10">
      {STEPS.map((label, i) => {
        const num = i + 1
        const done = current > num
        const active = current === num
        return (
          <div key={label} className="flex items-center gap-0 flex-1 last:flex-none">
            <div className="flex items-center gap-2.5 shrink-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  done
                    ? 'bg-primary text-primary-foreground'
                    : active
                    ? 'bg-primary/15 text-primary border border-primary/40'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {done ? '✓' : num}
              </div>
              <span
                className={`text-sm transition-colors ${
                  active ? 'text-foreground font-medium' : 'text-muted-foreground'
                }`}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 mx-4 h-px transition-colors ${
                  done ? 'bg-primary/30' : 'bg-border'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Shared input styles ────────────────────────────────────────────────────────

const inputCls =
  'px-3 py-2 rounded-md border border-input bg-card text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring text-sm w-full'

const selectCls =
  'px-3 py-2 rounded-md border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm'

// ── Main page ──────────────────────────────────────────────────────────────────

export default function NewBookPage() {
  const router = useRouter()
  const uid = useId()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Step 1 — basics
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState('Fantasy')
  const [premise, setPremise] = useState('')

  // Step 2 — characters
  const [characters, setCharacters] = useState<CharRow[]>([])

  // Step 3 — world
  const [worldEntries, setWorldEntries] = useState<WorldRow[]>([])

  // ── helpers ──
  function key() { return `${uid}-${Date.now()}-${Math.random()}` }

  function addCharacter() {
    setCharacters((cs) => [...cs, { _key: key(), name: '', role: 'supporting', description: '' }])
  }

  function updateCharacter(k: string, field: keyof CharRow, value: string) {
    setCharacters((cs) => cs.map((c) => (c._key === k ? { ...c, [field]: value } : c)))
  }

  function removeCharacter(k: string) {
    setCharacters((cs) => cs.filter((c) => c._key !== k))
  }

  function addWorldEntry() {
    setWorldEntries((ws) => [...ws, { _key: key(), name: '', type: 'location', summary: '' }])
  }

  function updateWorld(k: string, field: keyof WorldRow, value: string) {
    setWorldEntries((ws) => ws.map((w) => (w._key === k ? { ...w, [field]: value } : w)))
  }

  function removeWorld(k: string) {
    setWorldEntries((ws) => ws.filter((w) => w._key !== k))
  }

  function advance() {
    if (step === 1 && !title.trim()) { setError('Title is required.'); return }
    setError('')
    setStep((s) => s + 1)
  }

  // ── submit ──
  async function handleSubmit() {
    if (!title.trim()) { setError('Title is required.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          genre,
          premise: premise.trim() || null,
          characters: characters
            .filter((c) => c.name.trim())
            .map(({ name, role, description }) => ({ name: name.trim(), role, description: description.trim() || null })),
          worldEntries: worldEntries
            .filter((w) => w.name.trim())
            .map(({ name, type, summary }) => ({ name: name.trim(), type, summary: summary.trim() || null })),
        }),
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

      <main className="flex-1 flex items-start justify-center p-8 pt-12">
        <div className="w-full max-w-2xl">

          {/* Header */}
          <div className="mb-8 flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles size={16} className="text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">New Book</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Lay down the foundations — Tomos will build your world from here.
              </p>
            </div>
          </div>

          <StepBar current={step} />

          {/* ── Step 1: The Story ── */}
          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">
                  Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => { setTitle(e.target.value); setError('') }}
                  placeholder="The Ashen Throne"
                  autoFocus
                  className={inputCls}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Genre</label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className={selectCls}
                >
                  {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">
                  Premise{' '}
                  <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  value={premise}
                  onChange={(e) => setPremise(e.target.value)}
                  placeholder="What is this story about? Describe the central conflict, setting, or stakes in a few sentences."
                  rows={4}
                  className={`${inputCls} resize-none`}
                />
                <p className="text-xs text-muted-foreground">
                  Tomos uses this to generate your world logline and opening message.
                </p>
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-3 pt-1">
                <Link
                  href="/"
                  className="px-4 py-2 rounded-md border border-border text-sm text-center hover:bg-muted transition-colors"
                >
                  Cancel
                </Link>
                <button
                  onClick={advance}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Next: Characters
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Characters ── */}
          {step === 2 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-base font-semibold">Characters</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Add the people who drive your story. You can always add more later.
                </p>
              </div>

              {characters.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                    <BookOpen size={16} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    No characters yet. Add your protagonist, antagonist, or any key figures.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {characters.map((char) => (
                    <div
                      key={char._key}
                      className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3"
                    >
                      <div className="flex gap-3 items-start">
                        <div className="flex-1 flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Name
                          </label>
                          <input
                            type="text"
                            value={char.name}
                            onChange={(e) => updateCharacter(char._key, 'name', e.target.value)}
                            placeholder="Character name"
                            className={inputCls}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5" style={{ minWidth: 148 }}>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Role
                          </label>
                          <select
                            value={char.role}
                            onChange={(e) => updateCharacter(char._key, 'role', e.target.value)}
                            className={`${selectCls} w-full capitalize`}
                          >
                            {CHARACTER_ROLES.map((r) => (
                              <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => removeCharacter(char._key)}
                          className="mt-6 p-1.5 text-muted-foreground/50 hover:text-destructive transition-colors rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Description
                        </label>
                        <textarea
                          value={char.description}
                          onChange={(e) => updateCharacter(char._key, 'description', e.target.value)}
                          placeholder="Who are they? What drives them? What do they want?"
                          rows={2}
                          className={`${inputCls} resize-none`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={addCharacter}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-muted/50 transition-colors"
              >
                <Plus size={14} />
                Add character
              </button>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2 rounded-md border border-border text-sm hover:bg-muted transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={advance}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Next: The Setting
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: The Setting ── */}
          {step === 3 && (
            <div className="flex flex-col gap-5">
              <div>
                <h2 className="text-base font-semibold">The Setting</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Add places, groups, or any established facts that ground your story.
                </p>
              </div>

              {worldEntries.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border flex flex-col items-center justify-center py-10 gap-3 text-center">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
                    <BookOpen size={16} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground max-w-xs">
                    No entries yet. Add a city, an organisation, a rule of your world, or anything else that matters.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {worldEntries.map((entry) => (
                    <div
                      key={entry._key}
                      className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3"
                    >
                      <div className="flex gap-3 items-start">
                        <div className="flex-1 flex flex-col gap-1.5">
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Name
                          </label>
                          <input
                            type="text"
                            value={entry.name}
                            onChange={(e) => updateWorld(entry._key, 'name', e.target.value)}
                            placeholder="e.g. The Northern Reaches"
                            className={inputCls}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5" style={{ minWidth: 140 }}>
                          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Type
                          </label>
                          <select
                            value={entry.type}
                            onChange={(e) => updateWorld(entry._key, 'type', e.target.value)}
                            className={`${selectCls} w-full`}
                          >
                            {SETTING_TYPES.map((t) => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <button
                          onClick={() => removeWorld(entry._key)}
                          className="mt-6 p-1.5 text-muted-foreground/50 hover:text-destructive transition-colors rounded"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          Notes
                        </label>
                        <textarea
                          value={entry.summary}
                          onChange={(e) => updateWorld(entry._key, 'summary', e.target.value)}
                          placeholder="What is this? Why does it matter to the story?"
                          rows={2}
                          className={`${inputCls} resize-none`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={addWorldEntry}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-md border border-dashed border-border text-sm text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-muted/50 transition-colors"
              >
                <Plus size={14} />
                Add setting entry
              </button>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setStep(2)}
                  className="px-4 py-2 rounded-md border border-border text-sm hover:bg-muted transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
                >
                  {loading ? (
                    'Creating your book…'
                  ) : (
                    <>
                      <Sparkles size={14} />
                      Create Book
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-muted-foreground text-center -mt-1">
                Tomos will generate your world logline and an opening message from everything you've entered.
              </p>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}
