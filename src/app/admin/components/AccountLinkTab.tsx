'use client'

import React, { useEffect, useState } from 'react'
import { ArrowRight, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { BUTTON_CLASS, EmptyState, INPUT_CLASS, PRIMARY_BUTTON_CLASS, Panel, formatDateTime, jsonInit, requestJson } from './adminUi'

interface UserOption {
  id: string
  username: string
  displayName: string | null
  email: string
  isActive: boolean
}

interface AccountSummary {
  id: string
  username: string
  displayName: string
  email: string
  isActive: boolean
  google: boolean
  naver: boolean
  lastLogin: string | null
  createdAt: string
  revisions: number
}

interface Preview {
  plan: { ok: true; moveGoogle: boolean; moveNaver: boolean } | { ok: false; error: string }
  source: AccountSummary
  target: AccountSummary
}

function UserPicker({ label, hint, value, onChange }: { label: string; hint: string; value: UserOption | null; onChange: (user: UserOption | null) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UserOption[]>([])

  const search = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!query.trim()) return
    try {
      const data = await requestJson(`/api/wiki/users?limit=10&search=${encodeURIComponent(query.trim())}`)
      setResults(data.users || [])
      if ((data.users || []).length === 0) toast('검색 결과가 없습니다.')
    } catch (error) {
      toast.error((error as Error).message)
    }
  }

  return (
    <div className="min-w-0 flex-1 rounded-lg border border-adm-rule p-3">
      <p className="text-[13px] font-semibold text-adm-ink">{label}</p>
      <p className="mb-2 text-xs text-adm-muted">{hint}</p>
      {value ? (
        <div className="flex items-center justify-between gap-2 rounded-md bg-adm-well px-2.5 py-2 text-[13px]">
          <div className="min-w-0">
            <p className="truncate font-medium text-adm-ink">{value.displayName || value.username}</p>
            <p className="truncate text-adm-muted">
              @{value.username} · {value.email}
            </p>
          </div>
          <button type="button" className={BUTTON_CLASS} onClick={() => onChange(null)}>
            변경
          </button>
        </div>
      ) : (
        <>
          <form onSubmit={search} className="flex gap-1.5">
            <input
              className={INPUT_CLASS}
              placeholder="아이디 또는 이메일"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="submit" className={BUTTON_CLASS} aria-label="검색">
              <Search className="h-3.5 w-3.5" />
            </button>
          </form>
          <ul className="mt-2 space-y-1">
            {results.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(user)
                    setResults([])
                  }}
                  className="w-full rounded-md px-2 py-1.5 text-left text-[13px] hover:bg-adm-well"
                >
                  <span className="text-adm-ink">{user.displayName || user.username}</span>
                  <span className="ml-1.5 text-adm-muted">
                    @{user.username} · {user.email}
                    {!user.isActive ? ' · 비활성' : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function SummaryCard({ title, account }: { title: string; account: AccountSummary }) {
  return (
    <div className="min-w-0 flex-1 rounded-md bg-adm-well p-3 text-[13px]">
      <p className="text-xs text-adm-muted">{title}</p>
      <p className="mt-0.5 font-medium text-adm-ink">{account.displayName}</p>
      <p className="text-adm-muted">@{account.username}</p>
      <ul className="mt-2 space-y-0.5 text-adm-muted">
        <li>{account.email}</li>
        <li>
          구글 {account.google ? '연결' : '없음'} · 네이버 {account.naver ? '연결' : '없음'}
        </li>
        <li>편집 기록 {account.revisions}개</li>
        <li>최근 로그인 {formatDateTime(account.lastLogin)}</li>
      </ul>
    </div>
  )
}

export function AccountLinkTab() {
  const [source, setSource] = useState<UserOption | null>(null)
  const [target, setTarget] = useState<UserOption | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [running, setRunning] = useState(false)

  useEffect(() => {
    setPreview(null)
    if (!source || !target) return
    requestJson(`/api/admin/accounts/link?source=${source.id}&target=${target.id}`)
      .then(setPreview)
      .catch((error) => toast.error((error as Error).message))
  }, [source, target])

  const run = async () => {
    if (!preview?.plan.ok) return
    if (!window.confirm(`${preview.source.username}의 로그인을 ${preview.target.username} 계정으로 옮길까요? 새 계정은 비활성화됩니다.`)) return
    setRunning(true)
    try {
      const data = await requestJson('/api/admin/accounts/link', jsonInit('POST', { source: source!.id, target: target!.id }))
      toast.success(data.message)
      setSource(null)
      setTarget(null)
    } catch (error) {
      toast.error((error as Error).message)
    } finally {
      setRunning(false)
    }
  }

  return (
    <Panel
      title="계정 연결"
      description="다른 이메일로 로그인해서 새 계정이 생긴 회원을 기존 계정에 이어 줍니다. 새 계정의 구글·네이버 로그인과 편집 기록이 기존 계정으로 옮겨지고, 새 계정은 비활성화됩니다."
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
        <UserPicker label="새로 생긴 계정" hint="회원이 지금 로그인하는 계정" value={source} onChange={setSource} />
        <div className="flex items-center justify-center text-adm-faint">
          <ArrowRight className="h-5 w-5 rotate-90 md:rotate-0" />
        </div>
        <UserPicker label="기존 계정" hint="예전 문서와 기록이 있는 계정" value={target} onChange={setTarget} />
      </div>

      {source && target && (
        <div className="mt-4">
          {!preview ? (
            <EmptyState>확인하는 중입니다.</EmptyState>
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row">
                <SummaryCard title="새 계정 (비활성화됨)" account={preview.source} />
                <SummaryCard title="기존 계정 (계속 사용)" account={preview.target} />
              </div>
              {preview.plan.ok ? (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[13px] text-adm-muted">
                    옮길 로그인: {[preview.plan.moveGoogle && '구글', preview.plan.moveNaver && '네이버'].filter(Boolean).join(', ')}
                  </p>
                  <button type="button" className={PRIMARY_BUTTON_CLASS} disabled={running} onClick={run}>
                    {running ? '옮기는 중' : '계정 연결'}
                  </button>
                </div>
              ) : (
                <p className="mt-3 text-[13px] text-adm-warn">{preview.plan.error}</p>
              )}
            </>
          )}
        </div>
      )}
    </Panel>
  )
}
