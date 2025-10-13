"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'dark' | 'amoled' | 'galaxy'

type ThemeContextType = {
  theme: Theme
  setTheme: (t: Theme) => void
  toggleTheme: () => void
}

const THEME_ORDER: Theme[] = ['dark', 'amoled', 'galaxy']
const DEFAULT_THEME: Theme = 'dark'

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

const normalizeTheme = (value: string | null): Theme =>
  THEME_ORDER.includes(value as Theme) ? (value as Theme) : DEFAULT_THEME

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(DEFAULT_THEME)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const saved = normalizeTheme(localStorage.getItem('site-theme'))
    setThemeState(saved)
  }, [])

  useEffect(() => {
    if (typeof document === 'undefined') return
    document.documentElement.setAttribute('data-theme', theme)
    try { localStorage.setItem('site-theme', theme) } catch {}
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
