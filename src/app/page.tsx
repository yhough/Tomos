'use client'

import { BookCard } from '@/components/BookCard'
import { useTheme } from '@/hooks/useTheme'
import { mockBook, MOCK_BOOK_ID } from '@/lib/mock-data'
import type { Book } from '@/types'
import { OnboardingModal } from '@/components/OnboardingModal'
import { BookOpen, Clock, CreditCard, Home, Library, LogOut, Moon, Plus, Search, Settings, Sparkles, Sun, X } from 'lucide-react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

const MOCK_BOOK_CARD: Book = {
  id: MOCK_BOOK_ID,
  title: mockBook.title,
  genre: mockBook.genre,
  premise: null,
  protagonist_name: 'Kael Ardenvoss',
  protagonist_description: null,
  logline: mockBook.logline,
  word_count: 13_891,
  cover_image: null,
  created_at: new Date('2024-01-10').getTime(),
  updated_at: new Date('2024-01-14').getTime(),
}

type Tab = 'home' | 'library'

type User = { id: string; name: string; email: string; plan?: string; onboarded?: number }

export default function HomePage() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('home')
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const settingsRef = useRef<HTMLDivElement>(null)
  const { dark, toggle: toggleTheme } = useTheme()

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false)
      }
    }
    if (settingsOpen) document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [settingsOpen])

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((d) => { if (d.user) setUser(d.user) })
      .catch(() => {})

    fetch('/api/books')
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`)
        return r.json()
      })
      .then(setBooks)
      .catch(() => setBooks([]))
      .finally(() => setLoading(false))
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  function handleDelete(id: string) {
    fetch(`/api/books/${id}`, { method: 'DELETE' }).then(() =>
      setBooks((bs) => bs.filter((b) => b.id !== id))
    )
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-border bg-card h-screen sticky top-0">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2 px-4 border-b border-border">
          <Sparkles size={15} className="text-primary" />
          <span className="text-foreground text-xl" style={{ fontFamily: 'Lumos' }}>Tomos</span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 p-2 flex-1">
          <button
            onClick={() => setTab('home')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors w-full text-left ${
              tab === 'home'
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Home size={15} />
            Home
          </button>

          <button
            onClick={() => setTab('library')}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors w-full text-left ${
              tab === 'library'
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Library size={15} />
            Library
          </button>
        </nav>

        {/* New Book */}
        <div className="p-3 border-t border-border">
          <Link
            href="/books/new"
            className="flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus size={14} />
            New Book
          </Link>
        </div>

        {/* User profile */}
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2.5 px-1 py-1 rounded-md">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <span className="text-primary text-xs font-semibold" style={{ fontFamily: 'var(--font-geist-sans)' }}>
                {user?.name?.[0]?.toUpperCase() ?? '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground leading-tight truncate">{user?.name ?? '—'}</p>
              <p className="text-xs text-muted-foreground leading-tight truncate">
                {user?.plan === 'pro' ? 'Pro' : 'Free plan'}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground/50 hover:text-muted-foreground"
            >
              {dark ? <Sun size={13} /> : <Moon size={13} />}
            </button>
            <div className="relative shrink-0" ref={settingsRef}>
              <button
                onClick={() => setSettingsOpen((o) => !o)}
                title="Settings"
                className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground/50 hover:text-muted-foreground"
              >
                <Settings size={13} />
              </button>
              {settingsOpen && (
                <div className="absolute bottom-full right-0 mb-1.5 w-40 rounded-md border border-border bg-card shadow-md py-1 z-50">
                  <button
                    onClick={async () => {
                      setSettingsOpen(false)
                      const res = await fetch('/api/billing/portal', { method: 'POST' })
                      const { url } = await res.json()
                      if (url) window.location.href = url
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <CreditCard size={13} className="text-muted-foreground" />
                    Billing
                  </button>
                  <div className="h-px bg-border mx-2 my-1" />
                  <button
                    onClick={() => { setSettingsOpen(false); handleLogout() }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <LogOut size={13} className="text-muted-foreground" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        {tab === 'home' && <HomeTab books={books} loading={loading} userName={user?.name} />}
        {tab === 'library' && <LibraryTab books={books} loading={loading} onDelete={handleDelete} />}
      </main>
    </div>
  )
}

// ── Home tab ──────────────────────────────────────────────────────────────────

function HomeTab({ books, loading, userName }: { books: Book[]; loading: boolean; userName?: string }) {
  const recent = [MOCK_BOOK_CARD, ...books].slice(0, 4)
  const hasUserBooks = books.length > 0

  return (
    <div className="px-8 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-semibold tracking-tight" style={{ fontFamily: 'Lumos' }}>
          Welcome back{userName ? `, ${userName}` : ''}.
        </h1>
        <p className="text-muted-foreground mt-2">
          Pick up where you left off, or start something new.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <>
          <div className="flex items-center gap-2 mb-4">
            <Clock size={13} className="text-muted-foreground" />
            <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Recently updated
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {recent.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
          {hasUserBooks && books.length > 3 && (
            <p className="mt-4 text-sm text-muted-foreground">
              + {books.length - 3} more in Library
            </p>
          )}
        </>
      )}
    </div>
  )
}

// ── Library tab ───────────────────────────────────────────────────────────────

function LibraryTab({
  books,
  loading,
  onDelete,
}: {
  books: Book[]
  loading: boolean
  onDelete: (id: string) => void
}) {
  const [query, setQuery] = useState('')

  const filtered = (query.trim()
    ? books.filter((b) => b.title.toLowerCase().includes(query.trim().toLowerCase()))
    : books
  ).slice().sort((a, b) => a.title.localeCompare(b.title))

  return (
    <div className="px-8 py-12">
      <div className="mb-6 flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Library</h1>
          {!loading && (
            <p className="text-muted-foreground text-sm mt-1">
              {books.length} {books.length === 1 ? 'book' : 'books'}
            </p>
          )}
        </div>

        {/* Search bar */}
        {!loading && books.length > 0 && (
          <div className="relative w-64 shrink-0">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search titles…"
              className="w-full pl-8 pr-8 py-2 rounded-md border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : books.length === 0 ? (
        <EmptyState />
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <Search size={32} className="text-muted-foreground/40 mb-4" />
          <p className="text-sm font-medium text-foreground">No results for &ldquo;{query}&rdquo;</p>
          <p className="text-sm text-muted-foreground mt-1">Try a different title.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((book) => (
            <BookCard key={book.id} book={book} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center py-20 text-center">
      <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <BookOpen size={20} className="text-muted-foreground" />
      </div>
      <h2 className="text-base font-semibold mb-1">No books yet</h2>
      <p className="text-muted-foreground text-sm max-w-xs mb-5">
        Start a new book and Tomos will help you build its world, track characters, and keep everything consistent.
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
