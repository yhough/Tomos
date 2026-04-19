'use client'

import { WorldCard } from '@/components/WorldCard'
import type { World } from '@/types'
import { BookOpen, Plus, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function Home() {
  const [worlds, setWorlds] = useState<World[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/worlds')
      .then((r) => r.json())
      .then((data) => {
        setWorlds(
          data.map((w: Record<string, unknown>) => ({
            ...w,
            createdAt: new Date(w.created_at as number),
            updatedAt: new Date(w.updated_at as number),
          }))
        )
      })
      .finally(() => setLoading(false))
  }, [])

  function handleDelete(id: string) {
    fetch(`/api/worlds/${id}`, { method: 'DELETE' }).then(() =>
      setWorlds((ws) => ws.filter((w) => w.id !== id))
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
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
        {loading ? (
          <div className="flex items-center justify-center py-32 text-muted-foreground text-sm">
            Loading...
          </div>
        ) : worlds.length === 0 ? (
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
                <WorldCard key={world.id} world={world} onDelete={handleDelete} />
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
