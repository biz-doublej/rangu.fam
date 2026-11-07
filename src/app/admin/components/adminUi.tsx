'use client'

import React from 'react'

export const INPUT_CLASS =
  'w-full rounded border border-adm-rule bg-adm-sheet px-2.5 py-1.5 text-[13px] text-adm-ink placeholder:text-adm-faint focus:border-adm-accent focus:outline-none'
export const BUTTON_CLASS =
  'inline-flex items-center justify-center gap-1.5 rounded border border-adm-rule bg-adm-sheet px-2.5 py-1.5 text-[13px] text-adm-soft hover:border-adm-accent/50 hover:text-adm-ink disabled:cursor-not-allowed disabled:opacity-40'
export const PRIMARY_BUTTON_CLASS =
  'inline-flex items-center justify-center gap-1.5 rounded bg-adm-accent px-3 py-1.5 text-[13px] font-semibold text-adm-onaccent hover:bg-adm-accent/90 disabled:cursor-not-allowed disabled:opacity-40'
export const DANGER_BUTTON_CLASS =
  'inline-flex items-center justify-center gap-1.5 rounded border border-adm-pencil/40 bg-adm-sheet px-2.5 py-1.5 text-[13px] text-adm-pencil hover:bg-adm-pencil/10 disabled:cursor-not-allowed disabled:opacity-40'
/** 목록 위 필터 버튼 */
export function filterClass(active: boolean) {
  return `rounded px-2.5 py-1 text-[13px] ${
    active ? 'bg-adm-ink text-adm-sheet font-medium' : 'text-adm-muted hover:bg-adm-well hover:text-adm-ink'
  }`
}

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

/** 한 화면 안의 구역. 화면은 한 장의 시트이고, 구역은 가는 선으로 나뉜다. */
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
    <section className="border-b border-adm-rule px-5 py-5 last:border-b-0 sm:px-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-adm-ink">{title}</h2>
          {description && <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-adm-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  )
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-[13px] text-adm-muted">{children}</p>
}

export function Badge({ tone = 'slate', children }: { tone?: 'slate' | 'cyan' | 'amber' | 'rose' | 'emerald'; children: React.ReactNode }) {
  const tones = {
    slate: 'bg-adm-well text-adm-soft',
    cyan: 'bg-adm-accent/10 text-adm-accent',
    amber: 'bg-adm-warn/10 text-adm-warn',
    rose: 'bg-adm-pencil/10 text-adm-pencil',
    emerald: 'bg-adm-ok/10 text-adm-ok',
  }
  return <span className={`inline-flex rounded-sm px-1.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}>{children}</span>
}

export const ROLE_LABELS: Record<string, string> = {
  owner: '소유자',
  admin: '관리자',
  moderator: '운영자',
  editor: '편집자',
  viewer: '읽기 전용',
  user: '편집자',
}
