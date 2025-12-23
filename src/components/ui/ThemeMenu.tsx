"use client"

import React, { useState, useRef, useEffect } from 'react'
import { Settings } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'

const themes = [
  { id: 'dark', label: '다크 기본', description: '차분한 다크 글라스' },
  { id: 'amoled', label: 'AMOLED', description: '완전 블랙 + 네온' },
  { id: 'galaxy', label: '갤럭시', description: '우주 은하수 배경' },
  { id: 'christmas', label: '크리스마스', description: '눈 내리는 연말 무드' },
] as const

export default function ThemeMenu() {
  const { theme, setTheme, toggleTheme } = useTheme()
  const { isLoggedIn } = useAuth()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const handleSelect = (id: (typeof themes)[number]['id']) => {
    setTheme(id as any)
    setOpen(false)
  }

  return (
    <div className="relative" ref={ref}>
      <button
        className="glass-button p-2"
        onClick={() => setOpen(v => !v)}
        title="테마 설정"
      >
        <Settings className="w-5 h-5 text-primary-300" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 bg-gray-900/95 text-gray-100 border border-gray-700 rounded-2xl shadow-2xl z-50 p-3">
          <div className="flex items-center justify-between mb-2 px-1">
            <div>
              <div className="text-xs font-semibold text-gray-400">사이트 테마</div>
              <div className="text-[11px] text-gray-500">
                {isLoggedIn ? '로그인한 계정별로 기억돼요' : '브라우저 기준으로 저장돼요'}
              </div>
            </div>
            <button
              className="text-[11px] text-gray-400 hover:text-gray-200"
              onClick={() => toggleTheme()}
            >
              순환 변경
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-2">
            {themes.map(item => (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`group flex flex-col items-start rounded-xl border px-3 py-2 text-left transition-all duration-200 ${
                  theme === item.id
                    ? 'border-primary-400 bg-primary-500/10 shadow-glass'
                    : 'border-white/10 bg-white/5 hover:border-primary-300/60 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full text-xs">
                    {item.id === 'dark' && '🌙'}
                    {item.id === 'amoled' && '🖤'}
                    {item.id === 'galaxy' && '🌌'}
                    {item.id === 'christmas' && '🎄'}
                  </span>
                  <span className="text-xs font-semibold">{item.label}</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/40">
                  <div
                    className={
                      item.id === 'dark'
                        ? 'h-full w-full bg-gradient-to-r from-slate-700 via-slate-500 to-slate-300'
                        : item.id === 'amoled'
                        ? 'h-full w-full bg-gradient-to-r from-black via-fuchsia-600 to-cyan-400'
                        : item.id === 'galaxy'
                        ? 'h-full w-full bg-gradient-to-r from-indigo-500 via-sky-400 to-pink-400'
                        : 'h-full w-full bg-gradient-to-r from-red-500 via-emerald-400 to-amber-300'
                    }
                  />
                </div>
                <p className="mt-1 text-[11px] text-gray-400 group-hover:text-gray-200 line-clamp-2">
                  {item.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
