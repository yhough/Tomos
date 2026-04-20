'use client'

import { useEffect, useState } from 'react'

export function useTheme() {
  const [dark, setDark] = useState(false)

  // Sync initial state from the class that the inline script already set
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    setDark((prev) => {
      const next = !prev
      document.documentElement.classList.toggle('dark', next)
      try { localStorage.setItem('grimm-theme', next ? 'dark' : 'light') } catch { /* ok */ }
      return next
    })
  }

  return { dark, toggle }
}
