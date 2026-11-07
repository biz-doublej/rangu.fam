'use client'

import React from 'react'
import { BUTTON_CLASS, EmptyState, PRIMARY_BUTTON_CLASS, Panel, formatDateTime } from './adminUi'

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

function headline(pending: number, reports: number | null) {
  const open = reports ?? 0
  if (pending > 0 && open > 0) return `검수 ${pending}건과 신고 ${open}건이 기다리고 있어요`
  if (pending > 0) return `검수할 문서 ${pending}건이 기다리고 있어요`
  if (open > 0) return `처리할 신고 ${open}건이 있어요`
  return '지금 처리할 일이 없어요'
}

export function OverviewTab({ data, onJump }: { data: DashboardData | null; onJump: (tab: string) => void }) {
  if (!data) return <EmptyState>오늘 현황을 불러오는 중입니다.</EmptyState>
  const { stats } = data
  const today = new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })
  const facts: Array<[string, number]> = [
    ['문서', stats.pages.total],
    ['이번 주 편집', stats.pages.editsThisWeek],
    ['회원', stats.users.total],
    ['7일 안에 로그인', stats.users.activeWeek],
    ['오늘 가입', stats.users.newToday],
  ]

  return (
    <div>
      <section className="border-b border-adm-rule px-5 py-7 sm:px-8 sm:py-9">
        <p className="text-[13px] text-adm-muted">{today}</p>
        <h1 className="mt-1.5 max-w-xl text-[1.65rem] font-bold leading-snug tracking-[-0.01em] text-adm-ink sm:text-[1.9rem]">
          {headline(stats.submissions.pending, stats.reports.open)}
        </h1>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {stats.submissions.pending > 0 && (
            <button type="button" className={PRIMARY_BUTTON_CLASS} onClick={() => onJump('review')}>
              검수 시작
            </button>
          )}
          {(stats.reports.open ?? 0) > 0 && (
            <button type="button" className={BUTTON_CLASS} onClick={() => onJump('reports')}>
              신고 보기
            </button>
          )}
          {stats.submissions.onhold > 0 && (
            <button type="button" className="text-[13px] text-adm-muted underline-offset-4 hover:text-adm-ink hover:underline" onClick={() => onJump('review')}>
              보류해 둔 문서 {stats.submissions.onhold}건
            </button>
          )}
        </div>
        {stats.reports.open === null && (
          <p className="mt-4 text-[13px] text-adm-warn">신고 표가 아직 없어요. 서버와 DB 화면에서 관리자 도구 표를 만들어 주세요.</p>
        )}
      </section>

      <dl className="grid grid-cols-2 border-b border-adm-rule sm:grid-cols-5">
        {facts.map(([label, value], index) => (
          <div
            key={label}
            className={`px-5 py-4 sm:px-6 ${index > 0 ? 'sm:border-l' : ''} ${index % 2 === 1 ? 'border-l sm:border-l' : ''} ${
              index >= 2 ? 'border-t sm:border-t-0' : ''
            } border-adm-rule`}
          >
            <dd className="text-xl font-semibold tabular-nums text-adm-ink">{value.toLocaleString('ko-KR')}</dd>
            <dt className="mt-0.5 text-xs text-adm-muted">{label}</dt>
          </div>
        ))}
      </dl>

      <div className="grid lg:grid-cols-2 lg:divide-x lg:divide-adm-rule">
        <Panel title="검수 대기" description="최근에 제출된 순서입니다.">
          {data.recentSubmissions.length === 0 ? (
            <EmptyState>기다리는 문서가 없어요.</EmptyState>
          ) : (
            <ul className="-mx-2">
              {data.recentSubmissions.map((submission) => (
                <li key={submission.id}>
                  <button
                    type="button"
                    onClick={() => onJump('review')}
                    className="adm-flag flex w-full items-baseline justify-between gap-3 rounded px-3 py-2 text-left hover:bg-adm-well"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-adm-ink">{submission.title}</span>
                      <span className="block truncate text-xs text-adm-muted">{submission.author}</span>
                    </span>
                    <time className="shrink-0 text-xs tabular-nums text-adm-muted">{formatDateTime(submission.createdAt)}</time>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="최근 편집">
          {data.recentEdits.length === 0 ? (
            <EmptyState>최근 편집이 없어요.</EmptyState>
          ) : (
            <ul className="-mx-2">
              {data.recentEdits.map((edit) => (
                <li key={edit.id}>
                  <a
                    href={`/wiki/${encodeURIComponent(edit.title)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-baseline justify-between gap-3 rounded px-3 py-2 hover:bg-adm-well"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-adm-ink">{edit.title}</span>
                      <span className="block truncate text-xs text-adm-muted">
                        {edit.author}
                        {edit.summary ? `: ${edit.summary}` : ''}
                      </span>
                    </span>
                    <time className="shrink-0 text-xs tabular-nums text-adm-muted">{formatDateTime(edit.timestamp)}</time>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
