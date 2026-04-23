'use client'

import { Download, FileCode, FileText, X } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

type Format = 'markdown' | 'pdf'

interface CharData {
  traits?: string[]
  notable_moments?: string[]
}

export interface TimelineEvent {
  title: string
  description: string | null
  category: string | null
  characters: string[]
  in_story_date: string | null
  source: string
  source_id: string | null
}

export interface ExportData {
  book: {
    title: string
    genre: string
    premise: string | null
    logline: string | null
    protagonist_name: string | null
  }
  characters: Array<{
    name: string
    role: string
    description: string | null
    status: string
    arc_status: string | null
    data: CharData
  }>
  relationships: Array<{
    character_a_name: string
    character_b_name: string
    type: string
    description: string | null
    strength: number
    status: string
  }>
  lore: {
    locations: Array<{ name: string; summary: string | null }>
    factions: Array<{ name: string; summary: string | null }>
    magic: Array<{ name: string; summary: string | null }>
    worldLore: Array<{ name: string; summary: string | null }>
  }
  chapters: Array<{
    id: string
    number: number
    title: string
    summary: string | null
    word_count: number
    characters_appearing: string[]
  }>
  timeline: TimelineEvent[]
}

// ── Markdown generator ────────────────────────────────────────────────────────

function generateMarkdown(data: ExportData): string {
  const lines: string[] = []

  lines.push(`# ${data.book.title}`)
  if (data.book.genre) lines.push(`*${data.book.genre}*`)
  lines.push('')
  if (data.book.logline) {
    lines.push(`> ${data.book.logline}`)
    lines.push('')
  }

  if (data.book.premise) {
    lines.push('---', '', '## Premise', '', data.book.premise, '')
  }

  if (data.characters.length > 0) {
    lines.push('---', '', '## Characters', '')
    for (const c of data.characters) {
      lines.push(`### ${c.name}`)
      const meta = [`**Role:** ${c.role}`]
      if (c.status && c.status !== 'unknown') meta.push(`**Status:** ${c.status}`)
      if (c.arc_status) meta.push(`**Arc:** ${c.arc_status}`)
      lines.push(meta.join(' · '), '')
      if (c.description) lines.push(c.description, '')
      if (c.data?.traits?.length) {
        lines.push(`**Traits:** ${c.data.traits.join(', ')}`, '')
      }
      if (c.data?.notable_moments?.length) {
        lines.push('**Key Moments:**')
        for (const m of c.data.notable_moments) lines.push(`- ${m}`)
        lines.push('')
      }
    }
  }

  if (data.relationships.length > 0) {
    lines.push('---', '', '## Relationships', '')
    for (const r of data.relationships) {
      lines.push(`### ${r.character_a_name} ↔ ${r.character_b_name}`)
      const strength = '●'.repeat(r.strength) + '○'.repeat(5 - r.strength)
      lines.push(`**Type:** ${r.type} · **Strength:** ${strength} · **Status:** ${r.status}`)
      if (r.description) lines.push('', r.description)
      lines.push('')
    }
  }

  function loreSections(items: Array<{ name: string; summary: string | null }>, heading: string) {
    if (!items.length) return
    lines.push('---', '', `## ${heading}`, '')
    for (const item of items) {
      lines.push(`### ${item.name}`)
      if (item.summary) lines.push('', item.summary)
      lines.push('')
    }
  }

  loreSections(data.lore.locations, 'Locations')
  loreSections(data.lore.factions, 'Factions')
  loreSections(data.lore.magic, 'Magic & Systems')
  loreSections(data.lore.worldLore, 'World Lore')

  if (data.chapters.length > 0) {
    // Build a map of chapter-sourced events keyed by chapter id
    const eventsByChapter = new Map<string, TimelineEvent[]>()
    for (const e of data.timeline) {
      if (e.source === 'chapter' && e.source_id) {
        const list = eventsByChapter.get(e.source_id) ?? []
        list.push(e)
        eventsByChapter.set(e.source_id, list)
      }
    }

    lines.push('---', '', '## Story', '')
    for (const ch of data.chapters) {
      lines.push(`### Chapter ${ch.number}: ${ch.title}`)
      lines.push(`*${ch.word_count.toLocaleString('en-US')} words*`, '')
      if (ch.summary) lines.push(ch.summary, '')
      if (ch.characters_appearing.length > 0) {
        lines.push(`**Characters:** ${ch.characters_appearing.join(', ')}`, '')
      }
      const events = eventsByChapter.get(ch.id) ?? []
      if (events.length > 0) {
        lines.push('**Key Events:**')
        for (const e of events) {
          const datePart = e.in_story_date ? ` *(${e.in_story_date})*` : ''
          lines.push(`- **${e.title}**${datePart}${e.description ? ' — ' + e.description : ''}`)
        }
        lines.push('')
      }
    }
  }

  // World-history events not tied to a chapter
  const worldEvents = data.timeline.filter((e) => e.source !== 'chapter')
  if (worldEvents.length > 0) {
    lines.push('---', '', '## World History', '')
    for (const e of worldEvents) {
      const datePart = e.in_story_date ? ` *(${e.in_story_date})*` : ''
      lines.push(`**${e.title}**${datePart}`)
      if (e.description) lines.push(e.description)
      if (e.characters.length > 0) lines.push(`*Characters: ${e.characters.join(', ')}*`)
      lines.push('')
    }
  }

  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  lines.push('---', '', `*Generated by Tomos · ${date}*`)

  return lines.join('\n')
}

// ── Print HTML generator ──────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function generatePrintHtml(data: ExportData): string {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  function section(title: string, content: string): string {
    if (!content.trim()) return ''
    return `<section class="section"><h2>${esc(title)}</h2>${content}</section>`
  }

  function loreSection(title: string, items: Array<{ name: string; summary: string | null }>): string {
    if (!items.length) return ''
    return section(
      title,
      items
        .map(
          (item) =>
            `<div class="lore-item"><h3>${esc(item.name)}</h3>${item.summary ? `<p>${esc(item.summary)}</p>` : ''}</div>`
        )
        .join('')
    )
  }

  const charactersHtml = data.characters
    .map((c) => {
      const metaParts = [`Role: <em>${esc(c.role)}</em>`]
      if (c.status && c.status !== 'unknown') metaParts.push(`Status: <em>${esc(c.status)}</em>`)
      if (c.arc_status) metaParts.push(`Arc: <em>${esc(c.arc_status)}</em>`)
      const traits = c.data?.traits?.length
        ? `<div class="tags">${c.data.traits.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>`
        : ''
      const moments =
        c.data?.notable_moments?.length
          ? `<ul>${c.data.notable_moments.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>`
          : ''
      return `<div class="char-block">
        <h3>${esc(c.name)}</h3>
        <div class="meta">${metaParts.join(' &middot; ')}</div>
        ${c.description ? `<p>${esc(c.description)}</p>` : ''}
        ${traits}
        ${moments}
      </div>`
    })
    .join('')

  const relationshipsHtml = data.relationships
    .map((r) => {
      const filled = '&#9679;'.repeat(r.strength)
      const empty = '&#9675;'.repeat(5 - r.strength)
      return `<div class="rel-block">
        <h3>${esc(r.character_a_name)} &harr; ${esc(r.character_b_name)}</h3>
        <div class="meta">
          Type: <em>${esc(r.type)}</em> &middot;
          Strength: <span class="strength">${filled}${empty}</span> &middot;
          Status: <em>${esc(r.status)}</em>
        </div>
        ${r.description ? `<p>${esc(r.description)}</p>` : ''}
      </div>`
    })
    .join('')

  // Group chapter-sourced events by their chapter id
  const eventsByChapter = new Map<string, TimelineEvent[]>()
  for (const e of data.timeline) {
    if (e.source === 'chapter' && e.source_id) {
      const list = eventsByChapter.get(e.source_id) ?? []
      list.push(e)
      eventsByChapter.set(e.source_id, list)
    }
  }

  const storyHtml = data.chapters
    .map((ch) => {
      const events = eventsByChapter.get(ch.id) ?? []
      const eventsHtml = events.length
        ? `<ul class="event-list">${events
            .map((e) => {
              const datePart = e.in_story_date
                ? `<span class="tl-date">${esc(e.in_story_date)}</span>`
                : ''
              return `<li><strong>${esc(e.title)}</strong>${datePart}${
                e.description ? ` — ${esc(e.description)}` : ''
              }</li>`
            })
            .join('')}</ul>`
        : ''
      return `<div class="chapter-block">
        <div class="chapter-header">
          <h3>Ch. ${ch.number} — ${esc(ch.title)}</h3>
          <span class="chapter-meta">${ch.word_count.toLocaleString('en-US')} words</span>
        </div>
        ${ch.characters_appearing.length ? `<div class="meta">Characters: ${ch.characters_appearing.map(esc).join(', ')}</div>` : ''}
        ${ch.summary ? `<p>${esc(ch.summary)}</p>` : ''}
        ${eventsHtml}
      </div>`
    })
    .join('')

  // World-history events not tied to a specific chapter
  const worldEvents = data.timeline.filter((e) => e.source !== 'chapter')
  const worldHistoryHtml = worldEvents
    .map((e) => {
      const datePart = e.in_story_date ? `<span class="tl-date">${esc(e.in_story_date)}</span>` : ''
      return `<div class="tl-item">
        <div class="tl-header"><strong>${esc(e.title)}</strong>${datePart}</div>
        ${e.description ? `<p>${esc(e.description)}</p>` : ''}
        ${e.characters.length ? `<div class="meta">Characters: ${e.characters.map(esc).join(', ')}</div>` : ''}
      </div>`
    })
    .join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(data.book.title)} — World Bible</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.75;color:#1a1a1a;background:#fff}
.content{max-width:800px;margin:0 auto;padding:60px 40px}
h1{font-size:34px;font-weight:700;line-height:1.2;margin-bottom:6px}
.subtitle{font-size:14px;color:#666;font-style:italic;margin-bottom:20px}
.logline{font-size:16px;font-style:italic;color:#444;padding:14px 20px;border-left:3px solid #1a1a1a;background:#f8f8f8;margin-bottom:32px}
.section{margin-bottom:48px}
h2{font-size:20px;font-weight:700;padding-bottom:8px;border-bottom:2px solid #1a1a1a;margin-bottom:24px;margin-top:0}
h3{font-size:16px;font-weight:700;margin-bottom:6px}
p{margin-bottom:10px;color:#333}
.meta{font-size:12px;color:#888;margin-bottom:10px}
.meta em{color:#555;font-style:normal}
.char-block,.rel-block,.lore-item,.chapter-block{margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #eee}
.char-block:last-child,.rel-block:last-child,.lore-item:last-child,.chapter-block:last-child{border-bottom:none}
.tags{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px}
.tag{padding:2px 10px;background:#f0f0f0;border-radius:20px;font-size:12px;color:#555}
ul{margin:0 0 10px 20px}
li{margin-bottom:4px;color:#444;font-size:13px}
.event-list{margin:8px 0 0 0;padding-left:18px}
.event-list li{color:#333;font-size:13px;line-height:1.6}
.strength{font-size:10px;letter-spacing:1px}
.tl-item{margin-bottom:14px;padding-left:14px;border-left:2px solid #ddd}
.tl-header{margin-bottom:4px;display:flex;align-items:baseline;flex-wrap:wrap;gap:8px}
.tl-date{font-size:11px;color:#888;padding:1px 7px;background:#f0f0f0;border-radius:10px}
.chapter-header{display:flex;align-items:baseline;gap:12px;margin-bottom:4px}
.chapter-header h3{margin:0}
.chapter-meta{font-size:12px;color:#aaa}
.premise-text{white-space:pre-line}
.footer{text-align:center;font-size:11px;color:#bbb;padding:32px 0 0}

/* Screen-only print banner */
.print-banner{
  position:fixed;top:0;left:0;right:0;z-index:100;
  background:#111;color:#fff;
  display:flex;align-items:center;justify-content:center;gap:16px;
  padding:12px 24px;font-family:system-ui,sans-serif;font-size:13px;
}
.print-banner button{
  background:#fff;color:#111;border:none;padding:6px 16px;
  border-radius:4px;font-size:13px;font-weight:600;cursor:pointer;
}
.content{margin-top:48px}

@media print{
  .print-banner{display:none}
  .content{margin-top:0;padding:20px}
  h2{page-break-before:always}
  h2:first-child{page-break-before:auto}
  .char-block,.rel-block,.chapter-block{page-break-inside:avoid}
}
</style>
</head>
<body>
<div class="print-banner">
  <span>Use <strong>Print → Save as PDF</strong> to export</span>
  <button onclick="window.print()">Print / Save as PDF</button>
</div>
<div class="content">
  <h1>${esc(data.book.title)}</h1>
  ${data.book.genre ? `<div class="subtitle">${esc(data.book.genre)}</div>` : ''}
  ${data.book.logline ? `<div class="logline">${esc(data.book.logline)}</div>` : ''}
  ${data.book.premise ? section('Premise', `<p class="premise-text">${esc(data.book.premise)}</p>`) : ''}
  ${section('Characters', charactersHtml)}
  ${section('Relationships', relationshipsHtml)}
  ${loreSection('Locations', data.lore.locations)}
  ${loreSection('Factions', data.lore.factions)}
  ${loreSection('Magic & Systems', data.lore.magic)}
  ${loreSection('World Lore', data.lore.worldLore)}
  ${section('Story', storyHtml)}
  ${worldHistoryHtml ? section('World History', worldHistoryHtml) : ''}
  <div class="footer">Generated by Tomos &middot; ${esc(date)}</div>
</div>
</body>
</html>`
}

// ── Modal component ───────────────────────────────────────────────────────────

interface Props {
  bookId: string
  open: boolean
  onClose: () => void
}

const FORMAT_OPTIONS: { value: Format; label: string; description: string; icon: React.ElementType }[] = [
  {
    value: 'markdown',
    label: 'Markdown',
    description: 'Download a .md file — readable in any editor, version-control friendly, easy to share.',
    icon: FileCode,
  },
  {
    value: 'pdf',
    label: 'PDF',
    description: 'Opens a print-ready view in a new tab. Use your browser\'s Save as PDF option.',
    icon: FileText,
  },
]

export function ExportModal({ bookId, open, onClose }: Props) {
  const [format, setFormat] = useState<Format>('markdown')
  const [loading, setLoading] = useState(false)

  if (!open) return null

  async function handleExport() {
    if (format === 'pdf') {
      // window.open() must be called synchronously (before any await) to avoid popup blockers
      const win = window.open('', '_blank')
      if (!win) {
        toast.error('Popup blocked — allow popups for this site and try again.')
        return
      }
      win.document.write(
        '<html><body style="font-family:system-ui;padding:40px;color:#888">Loading world bible…</body></html>'
      )
      setLoading(true)
      try {
        const res = await fetch(`/api/books/${bookId}/export`)
        if (!res.ok) throw new Error('Failed to load world bible data')
        const data = (await res.json()) as ExportData
        win.document.open()
        win.document.write(generatePrintHtml(data))
        win.document.close()
        onClose()
      } catch (err) {
        win.close()
        toast.error(err instanceof Error ? err.message : 'Export failed')
      } finally {
        setLoading(false)
      }
      return
    }

    // Markdown
    setLoading(true)
    try {
      const res = await fetch(`/api/books/${bookId}/export`)
      if (!res.ok) throw new Error('Failed to load world bible data')
      const data = (await res.json()) as ExportData
      const md = generateMarkdown(data)
      const slug = data.book.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${slug}-world-bible.md`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Markdown exported')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-xl shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Export world bible</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Characters, lore, chapters, timeline — everything.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors ml-4 shrink-0"
          >
            <X size={14} />
          </button>
        </div>

        {/* Format selector */}
        <div className="px-5 py-5 flex flex-col gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">Format</p>
          {FORMAT_OPTIONS.map(({ value, label, description, icon: Icon }) => {
            const active = format === value
            return (
              <button
                key={value}
                onClick={() => setFormat(value)}
                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                  active
                    ? 'border-primary/40 bg-primary/8'
                    : 'border-border bg-card hover:bg-muted/40'
                }`}
              >
                <div
                  className={`mt-0.5 shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                    active ? 'border-primary' : 'border-border'
                  }`}
                >
                  {active && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Icon size={13} className={active ? 'text-primary' : 'text-muted-foreground'} />
                    <span className={`text-sm font-medium ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {label}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground/70 leading-relaxed">{description}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-5 pb-5">
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-1.5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin"
                  style={{ width: 13, height: 13 }}
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Exporting…
              </>
            ) : (
              <>
                <Download size={13} />
                Export
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
