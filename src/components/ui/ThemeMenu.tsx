"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Settings } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

export default function ThemeMenu() {
  const { theme, setTheme, toggleTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        className="glass-button p-2"
        onClick={() => setOpen(v => !v)}
        title="설정"
      >
        <Settings className="w-5 h-5 text-primary-300" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-gray-800 text-gray-100 border border-gray-700 rounded-lg shadow-lg z-50">
          <div className="px-3 py-2 text-xs text-gray-400">테마</div>
          <button
            className={`w-full text-left px-3 py-2 hover:bg-gray-700 ${theme === 'dark' ? 'text-white' : 'text-gray-200'}`}
            onClick={() => { setTheme('dark'); setOpen(false) }}
          >
            다크 (기본)
          </button>
          <button
            className={`w-full text-left px-3 py-2 hover:bg-gray-700 ${theme === 'amoled' ? 'text-white' : 'text-gray-200'}`}
            onClick={() => { setTheme('amoled'); setOpen(false) }}
          >
            AMOLED 다크
          </button>
          <div className="border-t border-gray-700" />
          <button className="w-full text-left px-3 py-2 text-gray-200 hover:bg-gray-700" onClick={() => { toggleTheme(); setOpen(false) }}>
            토글
          </button>
        </div>
      )}
    </div>
  )
}

