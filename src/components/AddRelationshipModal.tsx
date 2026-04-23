'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import type { CharacterFull } from './CharacterDetailSlideOver'

const REL_TYPES = ['ally', 'enemy', 'neutral', 'romantic', 'family', 'mentor', 'rival', 'unknown'] as const
const REL_STATUSES = ['active', 'strained', 'broken', 'unknown'] as const

const TYPE_LABELS: Record<string, string> = {
  ally: 'Ally', enemy: 'Enemy', neutral: 'Neutral', romantic: 'Romantic',
  family: 'Family', mentor: 'Mentor', rival: 'Rival', unknown: 'Unknown',
}
const STATUS_LABELS: Record<string, string> = {
  active: 'Active', strained: 'Strained', broken: 'Broken', unknown: 'Unknown',
}

const inputCls =
  'px-2.5 py-1.5 rounded-md border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring w-full'

interface Props {
  open: boolean
  characters: CharacterFull[]
  onClose: () => void
  onSubmit: (data: {
    character_a_id: string
    character_b_id: string
    type: string
    status: string
    strength: number
    description: string
  }) => Promise<void>
  isMock: boolean
}

export function AddRelationshipModal({ open, characters, onClose, onSubmit, isMock }: Props) {
  const [charA, setCharA] = useState('')
  const [charB, setCharB] = useState('')
  const [type, setType] = useState<string>('unknown')
  const [status, setStatus] = useState<string>('unknown')
  const [strength, setStrength] = useState(1)
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function reset() {
    setCharA(''); setCharB(''); setType('unknown'); setStatus('unknown')
    setStrength(1); setDescription(''); setError('')
  }

  function handleClose() { reset(); onClose() }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!charA) { setError('Select the first character.'); return }
    if (!charB) { setError('Select the second character.'); return }
    if (charA === charB) { setError('A character cannot relate to itself.'); return }
    setError('')
    setSaving(true)
    try {
      await onSubmit({ character_a_id: charA, character_b_id: charB, type, status, strength, description })
      reset()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-md bg-card border border-border rounded-xl shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Add relationship</h2>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 flex flex-col gap-4">
          {/* Characters */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Character A', value: charA, onChange: setCharA },
              { label: 'Character B', value: charB, onChange: setCharB },
            ].map(({ label, value, onChange }) => (
              <div key={label} className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  {label}
                </label>
                <select
                  value={value}
                  onChange={(e) => { onChange(e.target.value); setError('') }}
                  className={inputCls}
                >
                  <option value="">Select…</option>
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Type + Status */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className={inputCls}
              >
                {REL_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className={inputCls}
              >
                {REL_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
          </div>

          {/* Strength */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Strength — {strength} / 5
            </label>
            <div className="flex items-center gap-2">
              {Array.from({ length: 5 }, (_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setStrength(i + 1)}
                  className={`w-6 h-6 rounded-full border transition-colors ${
                    i < strength
                      ? 'bg-primary border-primary'
                      : 'bg-transparent border-border hover:border-primary/50'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
              Description <span className="normal-case font-normal text-muted-foreground/40">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="One sentence describing this relationship…"
              className={`${inputCls} resize-none`}
            />
          </div>

          {error && <p className="text-sm text-destructive -mt-1">{error}</p>}

          {isMock && (
            <p className="text-xs text-muted-foreground/60 italic">
              Demo mode — relationships won't be saved.
            </p>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Adding…' : 'Add relationship'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
