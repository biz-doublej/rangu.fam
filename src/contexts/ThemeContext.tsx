"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'amoled' | 'galaxy' | 'christmas'

type ThemeContextType = {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
}

const THEME_ORDER: Theme[] = ['dark', 'amoled', 'galaxy', 'christmas']
const DEFAULT_THEME: Theme = 'dark'

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const normalizeTheme = (value: string | null): Theme =>
  THEME_ORDER.includes(value as Theme) ? (value as Theme) : DEFAULT_THEME

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const rawUser = localStorage.getItem('rangu_user')
      let userId: string | null = null
      if (rawUser) {
        try {
          const parsed = JSON.parse(rawUser)
          userId = parsed?.id ?? null
        } catch {
          userId = null
        }
      }

      const key = userId ? `rangu_theme_${userId}` : 'site-theme'
      const saved = normalizeTheme(localStorage.getItem(key))
      setThemeState(saved)
    } catch {
      const fallback = normalizeTheme(localStorage.getItem('site-theme'))
      setThemeState(fallback)
    }
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-theme', theme)
    try {
      const rawUser = typeof window !== 'undefined' ? localStorage.getItem('rangu_user') : null
      let userId: string | null = null
      if (rawUser) {
        try {
          const parsed = JSON.parse(rawUser)
          userId = parsed?.id ?? null
        } catch {
          userId = null
        }
      }

      const key = userId ? `rangu_theme_${userId}` : 'site-theme'
      localStorage.setItem(key, theme)
      // 기본값도 유지
      localStorage.setItem('site-theme', theme)
    } catch {}
  }, [theme])

  const setTheme = (t: Theme) => setThemeState(t)
  const toggleTheme = () =>
    setThemeState(prev => THEME_ORDER[(THEME_ORDER.indexOf(prev) + 1) % THEME_ORDER.length])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
