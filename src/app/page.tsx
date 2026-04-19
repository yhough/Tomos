'use client'

import { BookCard } from '@/components/BookCard'
import type { Book } from '@/types'
import { BookOpen, Plus, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

export default function Home() {
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/books')
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      })
      .then(setBooks)
      .catch(() => setBooks([]))
      .finally(() => setLoading(false))
  }, [])

  function handleDelete(id: string) {
    fetch(`/api/books/${id}`, { method: 'DELETE' }).then(() =>
      setBooks((bs) => bs.filter((b) => b.id !== id))
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
            href="/books/new"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} />
            New Book
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10">
        {loading ? (
          <div className="flex items-center justify-center py-32 text-muted-foreground text-sm">
            Loading...
          </div>
        ) : books.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-semibold tracking-tight">Your Books</h1>
              <p className="text-muted-foreground text-sm mt-1">
                {books.length} {books.length === 1 ? 'book' : 'books'}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {books.map((book) => (
                <BookCard key={book.id} book={book} onDelete={handleDelete} />
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
      <h2 className="text-lg font-semibold mb-1">No books yet</h2>
      <p className="text-muted-foreground text-sm max-w-xs mb-6">
        Start a new book and Grimoire will help you build its world, track its characters, and keep everything consistent.
      </p>
      <Link
        href="/books/new"
        className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        <Plus size={14} />
        Start a Book
      </Link>
    </div>
  )
}
