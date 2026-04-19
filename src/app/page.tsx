'use client'

import { WorldCard } from '@/components/WorldCard'
import type { World } from '@/types'
import { BookOpen, Plus, Sparkles } from 'lucide-react'
import Link from 'next/link'

// Placeholder worlds — replace with db fetch once API is wired
const MOCK_WORLDS: World[] = [
  {
    id: 'demo-1',
    name: 'The Ashen Throne',
    genre: 'Fantasy',
    premise: 'A dying empire where magic is outlawed and the old gods have gone silent.',
    description:
      "A crumbling empire built on the bones of a forgotten magical age. The king is old, his heirs are at war, and something stirs in the Ashwood that hasn't moved in three hundred years.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3),
    updatedAt: new Date(Date.now() - 1000 * 60 * 32),
  },
  {
    id: 'demo-2',
    name: 'Outer Veil',
    genre: 'Science Fiction',
    premise: "Humanity's furthest colony loses contact with Earth — and starts receiving transmissions from something else.",
    description:
      "Set aboard the generation ship Covenant's Wake, 200 years after departure. Earth has gone quiet. The crew votes to investigate a signal that predates human spaceflight.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 5),
  },
  {
    id: 'demo-3',
    name: 'The Bellhaven Files',
    genre: 'Horror',
    premise: "A small coastal town where the tide brings things back that shouldn't return.",
    description:
      'Bellhaven, Maine. Population 1,400. Every seven years, the ocean gives something back to the town — and the town pays a price no one talks about.',
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1),
    updatedAt: new Date(Date.now() - 1000 * 60 * 8),
  },
]

export default function Home() {
  const worlds = MOCK_WORLDS

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            <span className="text-foreground text-xl" style={{ fontFamily: 'Lumos' }}>Grimoire</span>
          </div>
          <Link
            href="/worlds/new"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} />
            New World
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        {worlds.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight">Your Worlds</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {worlds.length} {worlds.length === 1 ? 'world' : 'worlds'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {worlds.map((world) => (
                <WorldCard key={world.id} world={world} onDelete={(id) => console.log('delete', id)} />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center">
      <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-5">
        <BookOpen size={24} className="text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold mb-1">No worlds yet</h2>
      <p className="text-muted-foreground text-sm max-w-xs mb-6">
        Create your first world and start building its lore through conversation.
      </p>
      <Link
        href="/worlds/new"
        className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <Plus size={14} />
        Create a World
      </Link>
    </div>
  )
}
