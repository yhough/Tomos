'use client'

import type { CorrectionAffectedEntities, CorrectionData, CorrectionStatus } from '@/types'
import { Check, Edit3, Loader2 } from 'lucide-react'

interface Props {
  correctionData: CorrectionData
  status: CorrectionStatus
  isConfirming: boolean
  onConfirm: () => void
  onCancel: () => void
}

function EntityPills({
  entities,
  isConfirmed,
}: {
  entities: CorrectionAffectedEntities
  isConfirmed?: boolean
}) {
  const hasAny =
    entities.loreEntries.length > 0 ||
    entities.characters.length > 0 ||
    entities.chapterSummaries.length > 0 ||
    entities.chapterFlags.length > 0

  if (!hasAny) return null

  return (
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Will update</p>
      <div className="flex flex-wrap gap-1.5">
        {entities.loreEntries.map((name) => (
          <span
            key={name}
            className={`text-[11px] px-2 py-0.5 rounded-full ${
              isConfirmed
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-muted border border-border text-muted-foreground'
            }`}
          >
            {name}
          </span>
        ))}
        {entities.characters.map((name) => (
          <span
            key={name}
            className={`text-[11px] px-2 py-0.5 rounded-full ${
              isConfirmed
                ? 'bg-green-100 text-green-700 border border-green-200'
                : 'bg-primary/10 text-primary border border-primary/20'
            }`}
          >
            {name}
          </span>
        ))}
        {entities.chapterSummaries.map((num) => (
          <span
            key={num}
            className={`text-[11px] px-2 py-0.5 rounded-full ${
              isConfirmed
                ? 'bg-green-100 text-green-800 border border-green-300'
                : 'bg-green-100 text-green-700 border border-green-200'
            }`}
          >
            Ch. {num} summary
          </span>
        ))}
        {entities.chapterFlags.map((flagId, i) => (
          <span
            key={flagId}
            className={`text-[11px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
              isConfirmed
                ? 'bg-green-100 text-green-800 border border-green-300'
                : 'bg-red-100 text-red-700 border border-red-200'
            }`}
          >
            <Check size={9} />
            {entities.chapterFlags.length === 1 ? '1 flag resolved' : `flag ${i + 1} resolved`}
          </span>
        ))}
      </div>
    </div>
  )
}

export function CorrectionConfirmCard({ correctionData, status, isConfirming, onConfirm, onCancel }: Props) {
  const isCancelled = status === 'cancelled'
  const isConfirmed = status === 'confirmed'

  return (
    <div
      className="rounded-xl border border-slate-200 bg-card border-l-4 border-l-slate-400 p-4 flex flex-col gap-3"
      style={{ opacity: isCancelled ? 0.5 : 1 }}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <Edit3 size={12} className="text-slate-500 shrink-0" />
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
          Proposed correction
        </span>
      </div>

      {/* Was / Now */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider w-6 shrink-0">Was</span>
          <span className="text-xs text-muted-foreground line-through leading-relaxed">
            {correctionData.whatChanged}
          </span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider w-6 shrink-0">Now</span>
          <span className={`text-xs leading-relaxed ${isConfirmed ? 'text-green-700' : 'text-foreground'}`}>
            {correctionData.whatItBecomes}
          </span>
        </div>
      </div>

      {/* Affected entities */}
      <EntityPills
        entities={correctionData.affectedEntities}
        isConfirmed={isConfirmed}
      />

      {/* Status / Buttons */}
      {isConfirmed ? (
        <div className="flex items-center gap-1.5 text-green-700">
          <Check size={13} />
          <span className="text-xs font-medium">Correction applied</span>
        </div>
      ) : isCancelled ? (
        <p className="text-xs text-muted-foreground italic">Correction cancelled</p>
      ) : (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
          >
            {isConfirming ? (
              <><Loader2 size={11} className="animate-spin" />Applying…</>
            ) : (
              <><Check size={11} />Apply correction</>
            )}
          </button>
          <button
            onClick={onCancel}
            disabled={isConfirming}
            className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
