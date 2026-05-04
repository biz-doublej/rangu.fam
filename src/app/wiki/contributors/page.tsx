'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Award, Crown, Medal, Trophy, Users, Calendar } from 'lucide-react'
import { WikiShell, WikiPageHeader } from '@/components/wiki'

interface Contributor {
  author: string
  edits: number
  pages: number
  totalSizeChange: number
  lastEdit: string
  firstEdit: string
  avatar?: string | null
  displayName?: string | null
  role?: string | null
  reputation?: number
}

const ROLE_LABEL: Record<string, { label: string; cls: string }> = {
  admin: { label: 'ADMIN', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  moderator: { label: 'MOD', cls: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  editor: { label: 'EDITOR', cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  owner: { label: 'OWNER', cls: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return '-'
  const diff = Date.now() - t
  const day = Math.floor(diff / 86400000)
  if (day < 1) return '오늘'
  if (day < 30) return `${day}일 전`
  if (day < 365) return `${Math.floor(day / 30)}개월 전`
  return `${Math.floor(day / 365)}년 전`
}

export default function WikiContributorsPage() {
  const router = useRouter()
  const [contributors, setContributors] = useState<Contributor[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    fetch('/api/wiki/contributors?limit=30')
      .then((r) => r.json())
      .then((d) => {
        if (mounted && d.success) setContributors(d.contributors || [])
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const totalEdits = contributors.reduce((s, c) => s + c.edits, 0)
  const totalPages = contributors.reduce((s, c) => s + c.pages, 0)

  return (
    <WikiShell
      pageHeader={
        <WikiPageHeader
          title="기여자"
          subtitle="이랑위키를 함께 만들어 가는 분들. 편집 횟수 기준 정렬."
          hatnote={
            <>
              새 편집은 매 시간마다 반영됩니다. 본인의 활동을 보려면{' '}
              <strong>위키 로그인</strong> 후 프로필에서 확인할 수 있습니다.
            </>
          }
          meta={[
            { label: '상위 기여자', value: `${contributors.length}명`, icon: Users },
            { label: '상위 편집 합계', value: `${totalEdits.toLocaleString()}회` },
            { label: '편집된 페이지(상위)', value: `${totalPages.toLocaleString()}개` },
          ]}
        />
      }
    >
      {loading ? (
        <section className="wiki-panel text-center py-10 text-sm text-[color:var(--wiki-ink-muted)]">
          기여자 목록을 불러오는 중…
        </section>
      ) : contributors.length === 0 ? (
        <section className="wiki-panel text-center py-10 text-sm text-[color:var(--wiki-ink-muted)]">
          기여자 정보가 없습니다.
        </section>
      ) : (
        <>
          {/* 상위 3 — 시상대 스타일 */}
          {contributors.length >= 3 && (
            <section className="mb-6">
              <div className="grid grid-cols-3 gap-3 items-end">
                {/* 2위 */}
                <PodiumCard rank={2} c={contributors[1]} icon={Medal} accent="from-gray-400 to-gray-600" h="h-32" />
                {/* 1위 */}
                <PodiumCard rank={1} c={contributors[0]} icon={Crown} accent="from-amber-400 to-amber-600" h="h-40" />
                {/* 3위 */}
                <PodiumCard rank={3} c={contributors[2]} icon={Award} accent="from-orange-500 to-orange-700" h="h-28" />
              </div>
            </section>
          )}

          {/* 4위~ 리스트 */}
          <section className="wiki-panel">
            <h3 className="wiki-serif text-base font-semibold mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[color:var(--wiki-accent)]" />
              전체 기여자
            </h3>
            <ul className="border border-[color:var(--wiki-rule)] rounded-sm overflow-hidden divide-y divide-[color:var(--wiki-rule)]">
              {contributors.map((c, i) => {
                const rank = i + 1
                const roleInfo = c.role ? ROLE_LABEL[c.role] : null
                const sz = c.totalSizeChange
                return (
                  <li
                    key={c.author}
                    className="px-3 py-2.5 hover:bg-[color:var(--wiki-paper-2)] transition-colors flex items-center gap-3"
                  >
                    <span
                      className={`w-7 text-center text-sm font-bold tabular-nums ${
                        rank <= 3
                          ? 'text-amber-400'
                          : rank <= 10
                            ? 'text-[color:var(--wiki-ink-soft)]'
                            : 'text-[color:var(--wiki-ink-muted)]'
                      }`}
                    >
                      {rank}
                    </span>
                    <button
                      type="button"
                      onClick={() => router.push(`/wiki/recent?author=${encodeURIComponent(c.author)}`)}
                      className="flex-1 min-w-0 text-left flex items-center gap-2 hover:text-[color:var(--wiki-link)]"
                      title={`${c.author}의 변경 기록 보기`}
                    >
                      <span className="wiki-serif text-sm text-[color:var(--wiki-ink)] truncate">
                        {c.displayName || c.author}
                      </span>
                      {c.author !== (c.displayName || c.author) && (
                        <span className="text-[10px] text-[color:var(--wiki-ink-muted)]">@{c.author}</span>
                      )}
                      {roleInfo && (
                        <span className={`wiki-chip text-[9px] ${roleInfo.cls}`}>{roleInfo.label}</span>
                      )}
                    </button>
                    <div className="flex items-center gap-3 text-xs text-[color:var(--wiki-ink-muted)] tabular-nums">
                      <span>
                        편집 <strong className="text-[color:var(--wiki-ink-soft)]">{c.edits.toLocaleString()}</strong>
                      </span>
                      <span>
                        페이지 <strong className="text-[color:var(--wiki-ink-soft)]">{c.pages}</strong>
                      </span>
                      {sz !== 0 && (
                        <span
                          className={`font-mono ${
                            sz > 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                          title="총 본문 크기 변화 (글자)"
                        >
                          {sz > 0 ? '+' : ''}
                          {sz.toLocaleString()}
                        </span>
                      )}
                      <span className="hidden sm:inline">{formatRelative(c.lastEdit)}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )}
    </WikiShell>
  )
}

function PodiumCard({
  rank,
  c,
  icon: Icon,
  accent,
  h,
}: {
  rank: number
  c: Contributor
  icon: typeof Crown
  accent: string
  h: string
}) {
  const router = useRouter()
  const roleInfo = c.role ? ROLE_LABEL[c.role] : null
  return (
    <button
      type="button"
      onClick={() => router.push(`/wiki/recent?author=${encodeURIComponent(c.author)}`)}
      className="group flex flex-col items-center text-center w-full"
      title={`${c.author}의 변경 기록 보기`}
    >
      {/* 메달/왕관 */}
      <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${accent} flex items-center justify-center mb-2 shadow-lg`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      {/* 이름 */}
      <div className="wiki-serif text-base font-semibold text-[color:var(--wiki-ink)] group-hover:text-[color:var(--wiki-link)] truncate max-w-full">
        {c.displayName || c.author}
      </div>
      <div className="text-[10px] text-[color:var(--wiki-ink-muted)] mb-1">@{c.author}</div>
      {roleInfo && (
        <span className={`wiki-chip text-[9px] mb-2 ${roleInfo.cls}`}>{roleInfo.label}</span>
      )}
      {/* 시상대 */}
      <div
        className={`w-full ${h} rounded-t-md bg-gradient-to-b ${accent} opacity-30 group-hover:opacity-50 transition-opacity flex flex-col items-center justify-end pb-2`}
      >
        <span className="text-3xl font-bold text-white tabular-nums" style={{ fontFamily: "'Gowun Batang', serif" }}>
          {rank}
        </span>
        <span className="text-[10px] text-white/80 tabular-nums mt-0.5">
          {c.edits.toLocaleString()} 편집
        </span>
      </div>
    </button>
  )
}
