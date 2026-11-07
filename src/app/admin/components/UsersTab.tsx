'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { RefreshCw, Search, X } from 'lucide-react'
import toast from 'react-hot-toast'
import {
  BUTTON_CLASS,
  Badge,
  DANGER_BUTTON_CLASS,
  EmptyState,
  INPUT_CLASS,
  PRIMARY_BUTTON_CLASS,
  Panel,
  ROLE_LABELS,
  filterClass,
  formatDateTime,
  jsonInit,
  requestJson,
} from './adminUi'

interface UserRow {
  id: string
  username: string
  displayName: string | null
  email: string
  role: string
  isActive: boolean
  banStatus: { isBanned?: boolean; reason?: string } | null
  warnings: Array<{ reason: string }> | null
  edits: number
  lastLogin: string | null
}

interface UserDetail {
  user: {
    id: string
    username: string
    displayName: string
    email: string
    role: string
    isActive: boolean
    banStatus: { isBanned?: boolean; reason?: string; bannedBy?: string; bannedAt?: string } | null
    warnings: Array<{ reason: string; warnedBy: string; warnedAt: string }>
    edits: number
    pagesCreated: number
    lastLogin: string | null
    createdAt: string
    identities: { google: boolean; legacySso: boolean; naver: string | null; discord: string | null }
  }
  logins: Array<{ id: string; provider: string; device: string; ip: string; createdAt: string }>
  edits: Array<{ id: string; title: string; summary: string | null; sizeChange: number; timestamp: string }>
}

const STATUS_FILTERS = [
  { key: '', label: '전체' },
  { key: 'active', label: '활성' },
  { key: 'banned', label: '차단' },
  { key: 'inactive', label: '비활성' },
]

const ASSIGNABLE_ROLES = ['viewer', 'editor', 'moderator']

function UserDetailPanel({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [detail, setDetail] = useState<UserDetail | null>(null)

  useEffect(() => {
    setDetail(null)
    requestJson(`/api/admin/users/${userId}`)
      .then(setDetail)
      .catch((error) => toast.error((error as Error).message))
  }, [userId])

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <aside
        className="h-full w-full max-w-md overflow-y-auto border-l border-adm-rule bg-adm-sheet p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-adm-ink">회원 상세</h3>
          <button type="button" className={BUTTON_CLASS} onClick={onClose} aria-label="닫기">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {!detail ? (
          <EmptyState>불러오는 중입니다.</EmptyState>
        ) : (
          <div className="space-y-5 text-[13px]">
            <section>
              <p className="text-base font-semibold text-adm-ink">{detail.user.displayName}</p>
              <p className="text-adm-muted">
                @{detail.user.username} · {detail.user.email}
              </p>
              <p className="mt-1 text-adm-muted">
                {ROLE_LABELS[detail.user.role] || detail.user.role} · 편집 {detail.user.edits} · 가입 {formatDateTime(detail.user.createdAt)}
              </p>
            </section>

            <section>
              <h4 className="mb-1.5 font-semibold text-adm-soft">연결 계정</h4>
              <ul className="space-y-1 text-adm-muted">
                <li>구글: {detail.user.identities.google ? '연결됨' : detail.user.identities.legacySso ? '예전 SSO만 있음' : '없음'}</li>
                <li>네이버: {detail.user.identities.naver || '없음'}</li>
                <li>Discord: {detail.user.identities.discord || '없음'}</li>
              </ul>
            </section>

            {(detail.user.banStatus?.isBanned || detail.user.warnings.length > 0) && (
              <section>
                <h4 className="mb-1.5 font-semibold text-adm-soft">제재 내역</h4>
                {detail.user.banStatus?.isBanned && (
                  <p className="text-adm-pencil">
                    차단 중: {detail.user.banStatus.reason || '사유 없음'} ({detail.user.banStatus.bannedBy})
                  </p>
                )}
                <ul className="mt-1 space-y-1 text-adm-warn">
                  {detail.user.warnings.map((warning, index) => (
                    <li key={index}>
                      경고: {warning.reason} · {warning.warnedBy} · {formatDateTime(warning.warnedAt)}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section>
              <h4 className="mb-1.5 font-semibold text-adm-soft">최근 로그인</h4>
              {detail.logins.length === 0 ? (
                <p className="text-adm-muted">기록이 없습니다.</p>
              ) : (
                <ul className="space-y-1 text-adm-muted">
                  {detail.logins.map((login) => (
                    <li key={login.id}>
                      {formatDateTime(login.createdAt)} · {login.provider} · {login.device} · {login.ip}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h4 className="mb-1.5 font-semibold text-adm-soft">최근 편집</h4>
              {detail.edits.length === 0 ? (
                <p className="text-adm-muted">기록이 없습니다.</p>
              ) : (
                <ul className="space-y-1 text-adm-muted">
                  {detail.edits.map((edit) => (
                    <li key={edit.id}>
                      <a
                        href={`/wiki/${encodeURIComponent(edit.title)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-adm-ink hover:text-adm-accent"
                      >
                        {edit.title}
                      </a>{' '}
                      · {edit.sizeChange >= 0 ? '+' : ''}
                      {edit.sizeChange} · {formatDateTime(edit.timestamp)}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </aside>
    </div>
  )
}

function UserActions({ user, onChanged }: { user: UserRow; onChanged: () => void }) {
  const [mode, setMode] = useState<'warn' | 'ban' | null>(null)
  const [reason, setReason] = useState('')
  const [days, setDays] = useState('0')
  const isBanned = Boolean(user.banStatus?.isBanned)
  const protectedUser = user.role === 'admin' || user.role === 'owner'

  const run = async (action: string, data?: Record<string, unknown>) => {
    try {
      const result = await requestJson('/api/wiki/users', jsonInit('POST', { action, userId: user.id, data }))
      toast.success(result.message || '처리했습니다.')
      setMode(null)
      setReason('')
      onChanged()
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  if (protectedUser) return <span className="text-xs text-adm-faint">관리자는 변경할 수 없음</span>

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-1.5">
        <select
          aria-label={`${user.username} 권한`}
          className="rounded-md border border-adm-rule bg-adm-well px-1.5 py-1 text-[13px] text-adm-ink"
          value={ASSIGNABLE_ROLES.includes(user.role) ? user.role : 'editor'}
          onChange={(event) => run('role', { role: event.target.value })}
        >
          {ASSIGNABLE_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
        <button type="button" className={BUTTON_CLASS} onClick={() => setMode(mode === 'warn' ? null : 'warn')}>
          경고
        </button>
        {isBanned ? (
          <button type="button" className={BUTTON_CLASS} onClick={() => run('unban')}>
            차단 해제
          </button>
        ) : (
          <button type="button" className={DANGER_BUTTON_CLASS} onClick={() => setMode(mode === 'ban' ? null : 'ban')}>
            차단
          </button>
        )}
      </div>
      {mode && (
        <div className="flex w-full max-w-xs gap-1.5">
          <input
            className={INPUT_CLASS}
            placeholder={mode === 'warn' ? '경고 사유' : '차단 사유'}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          {mode === 'ban' && (
            <select
              aria-label="차단 기간"
              className="rounded-md border border-adm-rule bg-adm-well px-1 text-[13px] text-adm-ink"
              value={days}
              onChange={(event) => setDays(event.target.value)}
            >
              <option value="1">1일</option>
              <option value="7">7일</option>
              <option value="30">30일</option>
              <option value="0">영구</option>
            </select>
          )}
          <button
            type="button"
            className={PRIMARY_BUTTON_CLASS}
            disabled={!reason.trim()}
            onClick={() => run(mode, mode === 'ban' ? { reason, duration: Number(days) } : { reason })}
          >
            확인
          </button>
        </div>
      )}
    </div>
  )
}

export function UsersTab() {
  const [search, setSearch] = useState('')
  const [applied, setApplied] = useState('')
  const [status, setStatus] = useState('')
  const [users, setUsers] = useState<UserRow[] | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setUsers(null)
    const params = new URLSearchParams({ limit: '100' })
    if (applied) params.set('search', applied)
    if (status) params.set('status', status)
    try {
      const data = await requestJson(`/api/wiki/users?${params}`)
      setUsers(data.users || [])
    } catch (error) {
      toast.error((error as Error).message)
      setUsers([])
    }
  }, [applied, status])

  useEffect(() => {
    load()
  }, [load])

  return (
    <Panel
      title="회원"
      description="운영자는 편집 검수와 신고를 처리할 수 있습니다. 관리자 권한은 화이트리스트로만 부여됩니다."
      actions={
        <button type="button" className={BUTTON_CLASS} onClick={load}>
          <RefreshCw className="h-3.5 w-3.5" />
          새로고침
        </button>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <form
          className="flex items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault()
            setApplied(search.trim())
          }}
        >
          <input
            className={`${INPUT_CLASS} w-52`}
            placeholder="아이디 또는 이메일"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button type="submit" className={BUTTON_CLASS} aria-label="검색">
            <Search className="h-3.5 w-3.5" />
          </button>
        </form>
        <div className="flex gap-1">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setStatus(filter.key)}
              className={filterClass(status === filter.key)}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {users === null ? (
        <EmptyState>불러오는 중입니다.</EmptyState>
      ) : users.length === 0 ? (
        <EmptyState>회원이 없습니다.</EmptyState>
      ) : (
        <ul className="divide-y divide-adm-rule">
          {users.map((user) => (
            <li key={user.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <button type="button" className="min-w-0 text-left text-[13px]" onClick={() => setDetailId(user.id)}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-sm font-medium text-adm-ink hover:text-adm-accent">
                    {user.displayName || user.username}
                  </span>
                  <Badge tone={user.role === 'admin' ? 'rose' : user.role === 'moderator' ? 'cyan' : 'slate'}>
                    {ROLE_LABELS[user.role] || user.role}
                  </Badge>
                  {user.banStatus?.isBanned ? (
                    <Badge tone="rose">차단</Badge>
                  ) : !user.isActive ? (
                    <Badge>비활성</Badge>
                  ) : null}
                  {(user.warnings?.length || 0) > 0 && <Badge tone="amber">경고 {user.warnings!.length}</Badge>}
                </div>
                <p className="mt-0.5 text-adm-muted">
                  @{user.username} · {user.email} · 편집 {user.edits} · 최근 로그인 {formatDateTime(user.lastLogin)}
                </p>
              </button>
              <UserActions user={user} onChanged={load} />
            </li>
          ))}
        </ul>
      )}

      {detailId && <UserDetailPanel userId={detailId} onClose={() => setDetailId(null)} />}
    </Panel>
  )
}
