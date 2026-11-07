'use client'

import React from 'react'

export const INPUT_CLASS =
  'w-full rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none'
export const BUTTON_CLASS =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-slate-700 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40'
export const PRIMARY_BUTTON_CLASS =
  'inline-flex items-center justify-center gap-1.5 rounded-md bg-cyan-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40'
export const DANGER_BUTTON_CLASS =
  'inline-flex items-center justify-center gap-1.5 rounded-md border border-rose-500/40 px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10 disabled:cursor-not-allowed disabled:opacity-40'

/** JSON 요청. 실패하면 서버의 오류 문구로 예외를 던진다. */
export async function requestJson<T = any>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: 'include', ...init })
  const data = await response.json().catch(() => null)
  if (!response.ok || data?.success === false) {
    throw new Error(data?.error || `요청을 처리하지 못했습니다. (${response.status})`)
  }
  return data as T
}

export function jsonInit(method: string, body: unknown): RequestInit {
  return { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return '—'
  return new Date(value).toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function Panel({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          {description && <p className="mt-0.5 text-xs text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  )
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-xs text-slate-500">{children}</p>
}

export function Badge({ tone = 'slate', children }: { tone?: 'slate' | 'cyan' | 'amber' | 'rose' | 'emerald'; children: React.ReactNode }) {
  const tones = {
    slate: 'border-slate-700 text-slate-300',
    cyan: 'border-cyan-500/40 text-cyan-300',
    amber: 'border-amber-500/40 text-amber-300',
    rose: 'border-rose-500/40 text-rose-300',
    emerald: 'border-emerald-500/40 text-emerald-300',
  }
  return <span className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-medium ${tones[tone]}`}>{children}</span>
}

export const ROLE_LABELS: Record<string, string> = {
  owner: '소유자',
  admin: '관리자',
  moderator: '운영자',
  editor: '편집자',
  viewer: '읽기 전용',
  user: '편집자',
}
