'use client'

import { useMemo, useState } from 'react'
import { Plus, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react'
import type { CharacterFull } from './CharacterDetailSlideOver'

// ── Types ────────────────────────────────────────────────────────────────────

export interface CharacterRelationship {
  id: string
  book_id: string
  character_a_id: string
  character_b_id: string
  type: 'ally' | 'enemy' | 'neutral' | 'romantic' | 'family' | 'mentor' | 'rival' | 'unknown'
  description: string | null
  strength: number
  status: 'active' | 'strained' | 'broken' | 'unknown'
  created_at: number
  updated_at: number
}

export interface RelationshipWithNames extends CharacterRelationship {
  character_a_name?: string
  character_a_role?: string
  character_b_name?: string
  character_b_role?: string
}

interface Props {
  characters: CharacterFull[]
  relationships: RelationshipWithNames[]
  hoveredCharId: string | null
  onNodeClick: (characterId: string) => void
  onEdgeClick: (rel: RelationshipWithNames) => void
  onAddClick: () => void
}

// ── Visual constants ──────────────────────────────────────────────────────────

const NODE_COLORS: Record<string, string> = {
  protagonist: '#1d4ed8',
  antagonist:  '#b91c1c',
  supporting:  '#b45309',
  minor:       '#71717a',
}

const NODE_RADII: Record<string, number> = {
  protagonist: 26,
  antagonist:  22,
  supporting:  18,
  minor:       14,
}

const EDGE_COLORS: Record<string, string> = {
  ally:     '#22c55e',
  enemy:    '#ef4444',
  romantic: '#ec4899',
  rival:    '#f59e0b',
  family:   '#8b5cf6',
  mentor:   '#3b82f6',
  neutral:  '#a1a1aa',
  unknown:  '#d4d4d8',
}

const STATUS_OPACITY: Record<string, number> = {
  active:   1.0,
  strained: 0.5,
  broken:   0.2,
  unknown:  0.4,
}

const ROLE_ORDER: Record<string, number> = {
  protagonist: 0, antagonist: 1, supporting: 2, minor: 3,
}

const LEGEND_ITEMS = [
  { type: 'ally',     label: 'Ally' },
  { type: 'enemy',    label: 'Enemy' },
  { type: 'romantic', label: 'Romantic' },
  { type: 'rival',    label: 'Rival (dashed)' },
  { type: 'family',   label: 'Family' },
  { type: 'mentor',   label: 'Mentor' },
  { type: 'neutral',  label: 'Neutral' },
  { type: 'unknown',  label: 'Unknown' },
]

// ── Layout ───────────────────────────────────────────────────────────────────

const VW = 800
const VH = 480

interface LayoutNode {
  id: string
  name: string
  role: string
  x: number
  y: number
}

function computeLayout(characters: CharacterFull[]): LayoutNode[] {
  const sorted = [...characters].sort(
    (a, b) => (ROLE_ORDER[a.role] ?? 4) - (ROLE_ORDER[b.role] ?? 4)
  )
  const n = sorted.length
  if (n === 0) return []

  const cx = VW / 2
  const cy = VH / 2
  const r = Math.min(VW, VH) * 0.36

  return sorted.map((char, i) => ({
    id: char.id,
    name: char.name,
    role: char.role,
    x: cx + r * Math.cos((2 * Math.PI * i) / n - Math.PI / 2),
    y: cy + r * Math.sin((2 * Math.PI * i) / n - Math.PI / 2),
  }))
}

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0] ?? '').join('').slice(0, 2).toUpperCase()
}

function getEdgeEndpoints(
  ax: number, ay: number, ar: number,
  bx: number, by: number, br: number
) {
  const dx = bx - ax
  const dy = by - ay
  const dist = Math.sqrt(dx * dx + dy * dy) || 1
  return {
    x1: ax + (dx / dist) * ar,
    y1: ay + (dy / dist) * ar,
    x2: bx - (dx / dist) * br,
    y2: by - (dy / dist) * br,
  }
}

// ── Component ────────────────────────────────────────────────────────────────

export function RelationshipMap({
  characters,
  relationships,
  hoveredCharId,
  onNodeClick,
  onEdgeClick,
  onAddClick,
}: Props) {
  const [zoom, setZoom] = useState(1)

  const layout = useMemo(() => computeLayout(characters), [characters])
  const nodeMap = useMemo(() => new Map(layout.map((n) => [n.id, n])), [layout])

  const zoomIn  = () => setZoom((z) => Math.min(z * 1.3, 3))
  const zoomOut = () => setZoom((z) => Math.max(z / 1.3, 0.35))
  const fit     = () => setZoom(1)

  // viewBox zooms from center
  const vbW = VW / zoom
  const vbH = VH / zoom
  const vbX = (VW - vbW) / 2
  const vbY = (VH - vbH) / 2

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (relationships.length === 0) {
    return (
      <div className="relative h-[420px] rounded-xl border border-border bg-card flex flex-col items-center justify-center gap-4">
        <div className="text-center max-w-xs">
          <p className="text-sm font-medium text-foreground mb-1">No relationships yet</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Relationships appear automatically as you build the world in chat, or you can add one manually.
          </p>
        </div>
        <button
          onClick={onAddClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={12} />
          Add relationship
        </button>
      </div>
    )
  }

  // ── Graph ────────────────────────────────────────────────────────────────────
  return (
    <div className="relative h-[420px] rounded-xl border border-border bg-card overflow-hidden">
      <svg
        width="100%"
        height="100%"
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        style={{ display: 'block' }}
      >
        {/* Edges */}
        {relationships.map((rel) => {
          const a = nodeMap.get(rel.character_a_id)
          const b = nodeMap.get(rel.character_b_id)
          if (!a || !b) return null

          const ar = NODE_RADII[a.role] ?? NODE_RADII.minor
          const br = NODE_RADII[b.role] ?? NODE_RADII.minor
          const ep = getEdgeEndpoints(a.x, a.y, ar, b.x, b.y, br)
          const color = EDGE_COLORS[rel.type] ?? EDGE_COLORS.unknown
          const opacity = STATUS_OPACITY[rel.status] ?? 0.5
          const width = Math.max(1.5, rel.strength * 0.9)

          return (
            <g
              key={rel.id}
              onClick={() => onEdgeClick(rel)}
              style={{ cursor: 'pointer' }}
            >
              {/* Wide invisible hit area */}
              <line
                x1={ep.x1} y1={ep.y1} x2={ep.x2} y2={ep.y2}
                stroke="transparent"
                strokeWidth={16}
              />
              {/* Visible line */}
              <line
                x1={ep.x1} y1={ep.y1} x2={ep.x2} y2={ep.y2}
                stroke={color}
                strokeWidth={width}
                strokeOpacity={opacity}
                strokeLinecap="round"
                strokeDasharray={rel.type === 'rival' ? '8 5' : undefined}
              />
            </g>
          )
        })}

        {/* Nodes */}
        {layout.map((node) => {
          const r = NODE_RADII[node.role] ?? NODE_RADII.minor
          const color = NODE_COLORS[node.role] ?? NODE_COLORS.minor
          const isHovered = node.id === hoveredCharId

          return (
            <g
              key={node.id}
              onClick={() => onNodeClick(node.id)}
              style={{ cursor: 'pointer' }}
            >
              {/* Hover glow */}
              {isHovered && (
                <circle
                  cx={node.x} cy={node.y} r={r + 7}
                  fill="rgba(245,158,11,0.22)"
                />
              )}

              {/* Circle */}
              <circle
                cx={node.x} cy={node.y} r={r}
                fill={color}
              />

              {/* Initials */}
              <text
                x={node.x} y={node.y}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize={Math.max(9, r * 0.62)}
                fontWeight="bold"
                fontFamily="Inter, system-ui, sans-serif"
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >
                {getInitials(node.name)}
              </text>

              {/* Name label */}
              <text
                x={node.x} y={node.y + r + 13}
                textAnchor="middle"
                dominantBaseline="auto"
                fill="hsl(var(--foreground))"
                fontSize={11}
                fontFamily="Inter, system-ui, sans-serif"
                style={{ userSelect: 'none', pointerEvents: 'none' }}
              >
                {node.name}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Zoom controls */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1">
        {[
          { icon: ZoomIn,    action: zoomIn,  title: 'Zoom in' },
          { icon: ZoomOut,   action: zoomOut, title: 'Zoom out' },
          { icon: Maximize2, action: fit,     title: 'Reset zoom' },
        ].map(({ icon: Icon, action, title }) => (
          <button
            key={title}
            onClick={action}
            title={title}
            className="w-7 h-7 flex items-center justify-center rounded-md bg-card/90 border border-border text-muted-foreground hover:text-foreground hover:bg-muted shadow-sm backdrop-blur-sm transition-colors"
          >
            <Icon size={13} />
          </button>
        ))}
      </div>

      {/* Add button */}
      <button
        onClick={onAddClick}
        className="absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-card/90 border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted shadow-sm backdrop-blur-sm transition-colors"
      >
        <Plus size={11} />
        Add
      </button>

      {/* Legend */}
      <div className="absolute bottom-3 left-3 bg-card/90 border border-border rounded-lg px-3 py-2.5 shadow-sm backdrop-blur-sm">
        <p className="text-[9px] font-semibold tracking-widest uppercase text-muted-foreground/60 mb-2">
          Relationship type
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {LEGEND_ITEMS.map(({ type, label }) => (
            <div key={type} className="flex items-center gap-2">
              <svg width="20" height="6" className="shrink-0">
                <line
                  x1="0" y1="3" x2="20" y2="3"
                  stroke={EDGE_COLORS[type]}
                  strokeWidth={2}
                  strokeDasharray={type === 'rival' ? '5 3' : undefined}
                />
              </svg>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
        <div className="mt-2 pt-2 border-t border-border/60">
          <p className="text-[9px] font-semibold tracking-widest uppercase text-muted-foreground/60 mb-1.5">
            Opacity = status
          </p>
          <div className="flex flex-col gap-1">
            {[
              { label: 'Active',   opacity: 1 },
              { label: 'Strained', opacity: 0.5 },
              { label: 'Broken',   opacity: 0.2 },
            ].map(({ label, opacity }) => (
              <div key={label} className="flex items-center gap-2">
                <svg width="20" height="6" className="shrink-0">
                  <line x1="0" y1="3" x2="20" y2="3" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeOpacity={opacity} />
                </svg>
                <span className="text-[10px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
