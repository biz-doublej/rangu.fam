'use client'

import React from 'react'
import { EmptyState, Panel, formatDateTime } from './adminUi'

export interface DashboardData {
  stats: {
    users: { total: number; active: number; banned: number; newToday: number; activeWeek: number }
    pages: { total: number; editsThisWeek: number }
    submissions: { pending: number; onhold: number; approved: number; rejected: number }
    reports: { open: number | null }
    images: { total: number; bytes: number }
  }
  system: {
    revision: string
    service: string
    nodeVersion: string
    instanceUptimeSeconds: number
    memoryMb: number
    dbLatencyMs: number
  }
  recentEdits: Array<{ id: string; title: string; author: string; summary: string | null; timestamp: string }>
  recentSubmissions: Array<{ id: string; title: string; author: string; createdAt: string }>
  generatedAt: string
}

function Stat({ label, value, hint, onClick }: { label: string; value: React.ReactNode; hint?: string; onClick?: () => void }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-left ${onClick ? 'hover:border-cyan-500/40' : ''}`}
    >
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold tabular-nums text-white">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-slate-500">{hint}</p>}
    </Tag>
  )
}

export function OverviewTab({ data, onJump }: { data: DashboardData | null; onJump: (tab: string) => void }) {
  if (!data) return <EmptyState>개요를 불러오는 중입니다.</EmptyState>
  const { stats } = data

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="검수 대기"
          value={stats.submissions.pending}
          hint={`보류 ${stats.submissions.onhold}`}
          onClick={() => onJump('review')}
        />
        <Stat
          label="열린 신고"
          value={stats.reports.open ?? '—'}
          hint={stats.reports.open === null ? '신고 표 생성 필요' : undefined}
          onClick={() => onJump('reports')}
        />
        <Stat label="문서" value={stats.pages.total} hint={`이번 주 편집 ${stats.pages.editsThisWeek}`} />
        <Stat
          label="회원"
          value={stats.users.total}
          hint={`7일 내 로그인 ${stats.users.activeWeek} · 오늘 가입 ${stats.users.newToday}`}
          onClick={() => onJump('users')}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="최근 편집">
          {data.recentEdits.length === 0 ? (
            <EmptyState>최근 편집이 없습니다.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-800">
              {data.recentEdits.map((edit) => (
                <li key={edit.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                  <div className="min-w-0">
                    <a
                      href={`/wiki/${encodeURIComponent(edit.title)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate font-medium text-slate-200 hover:text-cyan-300"
                    >
                      {edit.title}
                    </a>
                    <p className="truncate text-slate-500">
                      {edit.author}
                      {edit.summary ? ` · ${edit.summary}` : ''}
                    </p>
                  </div>
                  <time className="shrink-0 text-slate-500">{formatDateTime(edit.timestamp)}</time>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="검수 대기 문서" description="오래된 순서가 아니라 최근 제출 순입니다.">
          {data.recentSubmissions.length === 0 ? (
            <EmptyState>대기 중인 문서가 없습니다.</EmptyState>
          ) : (
            <ul className="divide-y divide-slate-800">
              {data.recentSubmissions.map((submission) => (
                <li key={submission.id} className="flex items-center justify-between gap-3 py-2 text-xs">
                  <button type="button" onClick={() => onJump('review')} className="min-w-0 text-left">
                    <p className="truncate font-medium text-slate-200 hover:text-cyan-300">{submission.title}</p>
                    <p className="truncate text-slate-500">{submission.author}</p>
                  </button>
                  <time className="shrink-0 text-slate-500">{formatDateTime(submission.createdAt)}</time>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
