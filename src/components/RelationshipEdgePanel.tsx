'use client'

import { useState } from 'react'
import { X, Trash2, Save } from 'lucide-react'
import type { RelationshipWithNames } from './RelationshipMap'

const REL_TYPES = ['ally', 'enemy', 'neutral', 'romantic', 'family', 'mentor', 'rival', 'unknown'] as const
const REL_STATUSES = ['active', 'strained', 'broken', 'unknown'] as const

const TYPE_LABELS: Record<string, string> = {
  ally: 'Ally', enemy: 'Enemy', neutral: 'Neutral', romantic: 'Romantic',
  family: 'Family', mentor: 'Mentor', rival: 'Rival', unknown: 'Unknown',
}
const STATUS_LABELS: Record<string, string> = {
  active: 'Active', strained: 'Strained', broken: 'Broken', unknown: 'Unknown',
}

const ROLE_STYLES: Record<string, string> = {
  protagonist: 'text-blue-700 bg-blue-500/10',
  antagonist:  'text-red-700 bg-red-500/10',
  supporting:  'text-amber-700 bg-amber-500/10',
  minor:       'text-zinc-600 bg-zinc-500/10',
}

interface Props {
  relationship: RelationshipWithNames | null
  onClose: () => void
  onSave: (id: string, patch: Partial<RelationshipWithNames>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  isMock: boolean
}

export function RelationshipEdgePanel({ relationship, onClose, onSave, onDelete, isMock }: Props) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [form, setForm] = useState<{
    type: string; status: string; strength: number; description: string
  }>({ type: 'unknown', status: 'unknown', strength: 1, description: '' })

  const open = relationship !== null

  function beginEdit() {
    if (!relationship) return
    setForm({
      type: relationship.type,
      status: relationship.status,
      strength: relationship.strength,
      description: relationship.description ?? '',
    })
    setEditing(true)
  }

  async function handleSave() {
    if (!relationship) return
    setSaving(true)
    await onSave(relationship.id, {
      type: form.type as RelationshipWithNames['type'],
      status: form.status as RelationshipWithNames['status'],
      strength: form.strength,
      description: form.description || null,
    })
    setSaving(false)
    setEditing(false)
  }

  async function handleDelete() {
    if (!relationship) return
    setDeleting(true)
    await onDelete(relationship.id)
    setDeleting(false)
    onClose()
  }

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30"
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 bottom-0 z-40 w-[380px] bg-card border-l border-border flex flex-col shadow-xl transition-transform duration-200 ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-border">
          <p className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/60">
            Relationship
          </p>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        </div>

        {relationship && (
          <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">

            {/* Characters */}
            <div className="flex items-start gap-3">
              {[
                { name: relationship.character_a_name, role: relationship.character_a_role },
                { name: relationship.character_b_name, role: relationship.character_b_role },
              ].map((char, i) => (
                <div key={i} className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                  <p className="text-sm font-semibold text-foreground leading-tight mb-1">
                    {char.name ?? '—'}
                  </p>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded capitalize ${ROLE_STYLES[char.role ?? 'minor'] ?? ROLE_STYLES.minor}`}>
                    {char.role ?? 'unknown'}
                  </span>
                </div>
              ))}
            </div>

            {/* View mode */}
            {!editing ? (
              <>
                {/* Type + status */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Type</p>
                    <span className="text-sm text-foreground capitalize">{TYPE_LABELS[relationship.type]}</span>
                  </div>
                  <div className="w-px h-8 bg-border" />
                  <div className="flex flex-col gap-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Status</p>
                    <span className="text-sm text-foreground capitalize">{STATUS_LABELS[relationship.status]}</span>
                  </div>
                </div>

                {/* Strength */}
                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Strength</p>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <div
                        key={i}
                        className={`w-4 h-4 rounded-full border ${
                          i < relationship.strength
                            ? 'bg-primary border-primary'
                            : 'bg-transparent border-border'
                        }`}
                      />
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">{relationship.strength} / 5</span>
                  </div>
                </div>

                {/* Description */}
                {relationship.description && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Description</p>
                    <p className="text-sm text-foreground leading-relaxed">{relationship.description}</p>
                  </div>
                )}

                <button
                  onClick={beginEdit}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 self-start transition-colors"
                >
                  Edit relationship
                </button>
              </>
            ) : (
              /* Edit mode */
              <div className="flex flex-col gap-4">
                {/* Type */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Type</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className="px-2.5 py-1.5 rounded-md border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {REL_TYPES.map((t) => (
                      <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                    className="px-2.5 py-1.5 rounded-md border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {REL_STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>

                {/* Strength */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                    Strength — {form.strength} / 5
                  </label>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, strength: i + 1 }))}
                        className={`w-5 h-5 rounded-full border transition-colors ${
                          i < form.strength
                            ? 'bg-primary border-primary'
                            : 'bg-transparent border-border hover:border-primary/50'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    placeholder="One sentence describing this relationship…"
                    className="px-2.5 py-2 rounded-md border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving || isMock}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Save size={11} />
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer — delete */}
        {relationship && !editing && (
          <div className="shrink-0 px-5 py-4 border-t border-border">
            <button
              onClick={handleDelete}
              disabled={deleting || isMock}
              className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-destructive transition-colors disabled:opacity-40"
            >
              <Trash2 size={11} />
              {deleting ? 'Deleting…' : 'Delete relationship'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
