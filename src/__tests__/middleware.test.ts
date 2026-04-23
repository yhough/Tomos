import { describe, it, expect } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { middleware } from '@/middleware'

const BASE = 'http://localhost:3000'

function makeRequest(pathname: string, token?: string): NextRequest {
  const url = `${BASE}${pathname}`
  const req = new NextRequest(url)
  if (token) {
    req.cookies.set('auth_session', token)
  }
  return req
}

describe('middleware – unauthenticated user', () => {
  it('redirects / to /login', () => {
    const req = makeRequest('/')
    const res = middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('redirects /books/123 to /login', () => {
    const req = makeRequest('/books/123')
    const res = middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('allows /login through', () => {
    const req = makeRequest('/login')
    const res = middleware(req)
    // NextResponse.next() has status 200
    expect(res.status).toBe(200)
  })

  it('allows /signup through', () => {
    const req = makeRequest('/signup')
    const res = middleware(req)
    expect(res.status).toBe(200)
  })
})

describe('middleware – authenticated user', () => {
  const token = 'valid-session-token'

  it('allows / through', () => {
    const req = makeRequest('/', token)
    const res = middleware(req)
    expect(res.status).toBe(200)
  })

  it('allows /books/123 through', () => {
    const req = makeRequest('/books/123', token)
    const res = middleware(req)
    expect(res.status).toBe(200)
  })

  it('redirects /login to / when already authenticated', () => {
    const req = makeRequest('/login', token)
    const res = middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(`${BASE}/`)
  })

  it('redirects /signup to / when already authenticated', () => {
    const req = makeRequest('/signup', token)
    const res = middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(`${BASE}/`)
  })
})

describe('middleware – public API routes', () => {
  it('always allows /api/auth/login (no token)', () => {
    const req = makeRequest('/api/auth/login')
    const res = middleware(req)
    expect(res.status).toBe(200)
  })

  it('always allows /api/auth/signup (no token)', () => {
    const req = makeRequest('/api/auth/signup')
    const res = middleware(req)
    expect(res.status).toBe(200)
  })

  it('always allows /api/webhooks/stripe (no token)', () => {
    const req = makeRequest('/api/webhooks/stripe')
    const res = middleware(req)
    expect(res.status).toBe(200)
  })
})

describe('middleware – Next.js internals and static assets', () => {
  it('allows /_next/static paths through', () => {
    const req = makeRequest('/_next/static/chunks/main.js')
    const res = middleware(req)
    expect(res.status).toBe(200)
  })

  it('allows /favicon.ico through', () => {
    const req = makeRequest('/favicon.ico')
    const res = middleware(req)
    expect(res.status).toBe(200)
  })
})
