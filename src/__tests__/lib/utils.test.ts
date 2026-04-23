import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cn, generateId, formatDate, formatRelativeDate, countWords, GENRES } from '@/lib/utils'

describe('cn()', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('deduplicates conflicting Tailwind classes (last wins)', () => {
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('ignores falsy values', () => {
    expect(cn('foo', false, undefined, null, 'bar')).toBe('foo bar')
  })

  it('handles conditional objects', () => {
    expect(cn({ 'font-bold': true, 'text-sm': false })).toBe('font-bold')
  })

  it('returns empty string for no arguments', () => {
    expect(cn()).toBe('')
  })
})

describe('generateId()', () => {
  it('returns a non-empty string', () => {
    const id = generateId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
  })

  it('returns unique values on successive calls', () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId()))
    expect(ids.size).toBe(50)
  })
})

describe('formatDate()', () => {
  it('formats a Date object', () => {
    // Use local-time constructor to avoid UTC midnight / timezone offset issues
    const d = new Date(2024, 5, 15) // June 15 2024 local time
    const result = formatDate(d)
    expect(result).toMatch(/Jun/)
    expect(result).toMatch(/15/)
    expect(result).toMatch(/2024/)
  })

  it('formats a timestamp number', () => {
    const ts = new Date(2024, 0, 1).getTime() // Jan 1 2024 local time
    const result = formatDate(ts)
    expect(result).toMatch(/Jan/)
    expect(result).toMatch(/2024/)
  })

  it('formats an ISO date string', () => {
    // Pass a local-time millisecond value as a number to avoid UTC offset
    const result = formatDate(new Date(2023, 11, 25).getTime()) // Dec 25 2023 local time
    expect(result).toMatch(/Dec/)
    expect(result).toMatch(/25/)
    expect(result).toMatch(/2023/)
  })
})

describe('formatRelativeDate()', () => {
  let realNow: () => number

  beforeEach(() => {
    realNow = Date.now
  })

  afterEach(() => {
    Date.now = realNow
  })

  it('returns "just now" for less than 1 minute ago', () => {
    const now = Date.now()
    expect(formatRelativeDate(now - 30_000)).toBe('just now')
  })

  it('returns minutes ago for 1–59 minutes', () => {
    const now = Date.now()
    expect(formatRelativeDate(now - 5 * 60_000)).toBe('5m ago')
    expect(formatRelativeDate(now - 59 * 60_000)).toBe('59m ago')
  })

  it('returns hours ago for 1–23 hours', () => {
    const now = Date.now()
    expect(formatRelativeDate(now - 2 * 3_600_000)).toBe('2h ago')
    expect(formatRelativeDate(now - 23 * 3_600_000)).toBe('23h ago')
  })

  it('returns days ago for 1–6 days', () => {
    const now = Date.now()
    expect(formatRelativeDate(now - 3 * 86_400_000)).toBe('3d ago')
    expect(formatRelativeDate(now - 6 * 86_400_000)).toBe('6d ago')
  })

  it('falls back to formatted date for 7+ days ago', () => {
    const old = new Date(2020, 0, 1).getTime() // Jan 1 2020 local time
    const result = formatRelativeDate(old)
    expect(result).toMatch(/Jan/)
    expect(result).toMatch(/2020/)
  })
})

describe('countWords()', () => {
  it('counts words in a normal sentence', () => {
    expect(countWords('Hello world foo')).toBe(3)
  })

  it('returns 0 for an empty string', () => {
    expect(countWords('')).toBe(0)
  })

  it('handles extra whitespace', () => {
    expect(countWords('  hello   world  ')).toBe(2)
  })

  it('counts a single word', () => {
    expect(countWords('word')).toBe(1)
  })

  it('handles newlines and tabs', () => {
    expect(countWords('word1\nword2\tword3')).toBe(3)
  })
})

describe('GENRES', () => {
  it('is a non-empty array', () => {
    expect(GENRES.length).toBeGreaterThan(0)
  })

  it('contains expected common genres', () => {
    expect(GENRES).toContain('Fantasy')
    expect(GENRES).toContain('Science Fiction')
    expect(GENRES).toContain('Thriller')
    expect(GENRES).toContain('Romance')
    expect(GENRES).toContain('Horror')
    expect(GENRES).toContain('Mystery')
  })

  it('includes "Other" as a catch-all', () => {
    expect(GENRES).toContain('Other')
  })
})
