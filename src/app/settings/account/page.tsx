'use client'

import React, { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Camera, ChevronLeft, Link2, Lock, LogOut, Trash2, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '@/contexts/AuthContext'
import { AvatarEditor } from '@/components/account/AvatarEditor'

type TabKey = 'profile' | 'accounts' | 'security'
type ProviderKey = 'google' | 'naver' | 'discord'

interface Identity {
  linked: boolean
  detail?: string | null
}

interface Account {
  username: string
  displayName: string
  email: string
  avatar: string | null
  nextNameChangeAt: string | null
  loginMethodCount: number
  identities: Record<ProviderKey, Identity>
}

interface LoginRecord {
  id: string
  provider: string
  device: string
  ip: string
  createdAt: string
}

const TABS: Array<{ key: TabKey; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { key: 'profile', label: '프로필', icon: User },
  { key: 'accounts', label: '연결 계정', icon: Link2 },
  { key: 'security', label: '보안', icon: Lock },
]

const PROVIDERS: Array<{ key: ProviderKey; label: string; note: string; linkPath: string; unlinkPath: string }> = [
  {
    key: 'google',
    label: '구글',
    note: '로그인에 사용',
    linkPath: '/auth/link/google/start',
    unlinkPath: '/api/account/identities/google/unlink',
  },
  {
    key: 'naver',
    label: '네이버',
    note: '로그인에 사용',
    linkPath: '/auth/naver/link/start',
    unlinkPath: '/api/account/identities/naver/unlink',
  },
  {
    key: 'discord',
    label: 'Discord',
    note: '계정 정보 연결',
    linkPath: `/api/auth/discord/link/start?callbackUrl=${encodeURIComponent('/settings/account?tab=accounts')}`,
    unlinkPath: '/api/auth/discord/unlink',
  },
]

const LINK_ERRORS: Record<string, string> = {
  provider_already_linked: '이미 다른 회원에게 연결된 계정입니다.',
  link_session_expired: '연결 시간이 지났습니다. 다시 시도해 주세요.',
  login_required: '로그인 후 다시 시도해 주세요.',
  naver_not_configured: '네이버 연결이 아직 설정되지 않았습니다.',
  discord_not_configured: 'Discord 연결이 아직 설정되지 않았습니다.',
}

const PROVIDER_LABELS: Record<string, string> = { google: '구글', naver: '네이버', discord: 'Discord' }

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ink-500/10 bg-white/70 p-5 sm:p-7">
      <h2 className="text-lg font-bold text-ink-500">{title}</h2>
      {description && <p className="mt-1 text-sm text-ink-300">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}

function AccountSettings() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { logout } = useAuth()
  const fileInput = useRef<HTMLInputElement>(null)

  const [account, setAccount] = useState<Account | null>(null)
  const [logins, setLogins] = useState<LoginRecord[] | null>(null)
  const [nameDraft, setNameDraft] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [savingAvatar, setSavingAvatar] = useState(false)
  const [unlinking, setUnlinking] = useState<ProviderKey | null>(null)

  const requestedTab = searchParams.get('tab')
  const tab: TabKey = requestedTab === 'accounts' || requestedTab === 'security' ? requestedTab : 'profile'

  const loadAccount = useCallback(async () => {
    const response = await fetch('/api/account', { cache: 'no-store' })
    if (response.status === 401) {
      const loginPath = window.location.hostname.endsWith('irang.wiki') ? '/wiki/login' : '/login'
      router.replace(`${loginPath}?callbackUrl=${encodeURIComponent('/settings/account')}`)
      return
    }
    const data = await response.json()
    if (data.success) {
      setAccount(data.account)
      setNameDraft(data.account.displayName)
    }
  }, [router])

  useEffect(() => {
    loadAccount().catch(() => toast.error('계정 정보를 불러오지 못했습니다.'))
  }, [loadAccount])

  useEffect(() => {
    if (tab !== 'security') return
    fetch('/api/account/logins', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => setLogins(data.success ? data.logins : []))
      .catch(() => setLogins([]))
  }, [tab])

  useEffect(() => {
    const linked = searchParams.get('linked')
    const linkError = searchParams.get('linkError') || searchParams.get('discordError')
    const discordLinked = searchParams.get('discord') === 'linked'
    if (!linked && !linkError && !discordLinked) return
    if (linked || discordLinked) toast.success(`${PROVIDER_LABELS[linked || 'discord']} 계정을 연결했습니다.`)
    if (linkError) toast.error(LINK_ERRORS[linkError] || '계정 연결에 실패했습니다.')
    router.replace(`/settings/account?tab=${tab}`)
  }, [router, searchParams, tab])

  const saveName = async (event: React.FormEvent) => {
    event.preventDefault()
    setSavingName(true)
    try {
      const response = await fetch('/api/account/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName: nameDraft }),
      })
      const data = await response.json()
      if (!data.success) {
        toast.error(data.error || '표시 이름을 저장하지 못했습니다.')
        return
      }
      toast.success('표시 이름을 변경했습니다.')
      await loadAccount()
    } finally {
      setSavingName(false)
    }
  }

  const saveAvatar = async (blob: Blob) => {
    setSavingAvatar(true)
    try {
      const form = new FormData()
      form.append('file', blob, 'avatar.jpg')
      const response = await fetch('/api/account/avatar', { method: 'POST', body: form })
      const data = await response.json()
      if (!data.success) {
        toast.error(data.error || '사진을 저장하지 못했습니다.')
        return
      }
      setPendingFile(null)
      toast.success('프로필 사진을 변경했습니다.')
      await loadAccount()
    } finally {
      setSavingAvatar(false)
    }
  }

  const removeAvatar = async () => {
    if (!window.confirm('프로필 사진을 삭제할까요?')) return
    const response = await fetch('/api/account/avatar', { method: 'DELETE' })
    const data = await response.json()
    if (data.success) {
      toast.success('프로필 사진을 삭제했습니다.')
      await loadAccount()
    } else {
      toast.error(data.error || '사진을 삭제하지 못했습니다.')
    }
  }

  const unlink = async (provider: (typeof PROVIDERS)[number]) => {
    if (!window.confirm(`${provider.label} 연결을 해제할까요?`)) return
    setUnlinking(provider.key)
    try {
      const response = await fetch(provider.unlinkPath, { method: 'POST' })
      const data = await response.json()
      if (data.success) {
        toast.success(`${provider.label} 연결을 해제했습니다.`)
        await loadAccount()
      } else {
        toast.error(data.error || '연결을 해제하지 못했습니다.')
      }
    } finally {
      setUnlinking(null)
    }
  }

  if (!account) {
    return <p className="py-24 text-center text-sm text-ink-300">계정 정보를 불러오는 중입니다.</p>
  }

  const nameLocked = Boolean(account.nextNameChangeAt)

  return (
    <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
      <nav aria-label="계정 설정 메뉴" className="flex gap-1 overflow-x-auto lg:flex-col">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            aria-current={tab === key ? 'page' : undefined}
            onClick={() => router.replace(`/settings/account?tab=${key}`)}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              tab === key ? 'bg-ink-500 text-paper-50' : 'text-ink-400 hover:bg-ink-500/5'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      <div className="min-w-0 space-y-5">
        {tab === 'profile' && (
          <>
            <Section title="프로필 사진" description="JPG, PNG, WebP 이미지를 5MB까지 올릴 수 있습니다.">
              <div className="flex flex-wrap items-center gap-5">
                {account.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={account.avatar} alt="현재 프로필 사진" className="h-24 w-24 rounded-full object-cover" />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-coral-500/15 text-3xl font-bold text-coral-500">
                    {account.displayName.charAt(0)}
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fileInput.current?.click()}
                    className="inline-flex items-center gap-2 rounded-lg bg-ink-500 px-4 py-2 text-sm font-bold text-paper-50 hover:bg-ink-600"
                  >
                    <Camera className="h-4 w-4" />
                    사진 변경
                  </button>
                  {account.avatar && (
                    <button
                      type="button"
                      onClick={removeAvatar}
                      className="inline-flex items-center gap-2 rounded-lg border border-ink-500/15 px-4 py-2 text-sm font-medium text-ink-400 hover:bg-ink-500/5"
                    >
                      <Trash2 className="h-4 w-4" />
                      삭제
                    </button>
                  )}
                </div>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ''
                    if (!file) return
                    if (file.size > 5 * 1024 * 1024) {
                      toast.error('이미지는 5MB 이하만 올릴 수 있습니다.')
                      return
                    }
                    setPendingFile(file)
                  }}
                />
              </div>
            </Section>

            <Section title="표시 이름" description="사이트에 보이는 이름입니다. 7일에 한 번 바꿀 수 있습니다.">
              <form onSubmit={saveName} className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  maxLength={20}
                  disabled={nameLocked}
                  aria-label="표시 이름"
                  className="min-w-0 flex-1 rounded-lg border border-ink-500/20 bg-white px-3 py-2 text-sm text-ink-500 outline-none focus:border-ink-500 disabled:bg-ink-500/5"
                />
                <button
                  type="submit"
                  disabled={savingName || nameLocked || nameDraft.trim() === account.displayName}
                  className="rounded-lg bg-ink-500 px-4 py-2 text-sm font-bold text-paper-50 hover:bg-ink-600 disabled:opacity-40"
                >
                  {savingName ? '저장 중' : '저장'}
                </button>
              </form>
              {account.nextNameChangeAt && (
                <p className="mt-2 text-xs text-ink-300">{formatDateTime(account.nextNameChangeAt)}부터 다시 바꿀 수 있습니다.</p>
              )}
            </Section>

            <Section title="계정 정보">
              <dl className="grid gap-3 text-sm sm:grid-cols-[100px_minmax(0,1fr)]">
                <dt className="text-ink-300">아이디</dt>
                <dd className="break-all font-medium text-ink-500">{account.username}</dd>
                <dt className="text-ink-300">이메일</dt>
                <dd className="break-all font-medium text-ink-500">{account.email}</dd>
              </dl>
            </Section>
          </>
        )}

        {tab === 'accounts' && (
          <Section title="연결 계정" description="구글과 네이버 중 하나는 로그인 수단으로 남아 있어야 합니다.">
            <ul className="divide-y divide-ink-500/10">
              {PROVIDERS.map((provider) => {
                const identity = account.identities[provider.key]
                const isLastLogin = provider.key !== 'discord' && identity.linked && account.loginMethodCount <= 1
                return (
                  <li key={provider.key} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink-500">{provider.label}</p>
                      <p className="mt-0.5 break-all text-xs text-ink-300">
                        {identity.linked ? identity.detail || '연결됨' : provider.note}
                      </p>
                    </div>
                    {identity.linked ? (
                      <button
                        type="button"
                        disabled={isLastLogin || unlinking === provider.key}
                        title={isLastLogin ? '마지막 로그인 수단은 해제할 수 없습니다.' : undefined}
                        onClick={() => unlink(provider)}
                        className="rounded-lg border border-ink-500/15 px-3 py-1.5 text-sm font-medium text-ink-400 hover:bg-ink-500/5 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        연결 해제
                      </button>
                    ) : (
                      <a
                        href={provider.linkPath}
                        className="rounded-lg bg-ink-500 px-3 py-1.5 text-sm font-bold text-paper-50 hover:bg-ink-600"
                      >
                        연결하기
                      </a>
                    )}
                  </li>
                )
              })}
            </ul>
          </Section>
        )}

        {tab === 'security' && (
          <>
            <Section title="최근 로그인 내역" description="모르는 기록이 보이면 구글이나 네이버 비밀번호를 바꿔 주세요.">
              {logins === null ? (
                <p className="text-sm text-ink-300">불러오는 중입니다.</p>
              ) : logins.length === 0 ? (
                <p className="text-sm text-ink-300">아직 기록이 없습니다. 다음 로그인부터 표시됩니다.</p>
              ) : (
                <ul className="divide-y divide-ink-500/10">
                  {logins.map((login) => (
                    <li key={login.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0">
                      <div>
                        <p className="text-sm font-medium text-ink-500">{login.device}</p>
                        <p className="mt-0.5 text-xs text-ink-300">
                          {PROVIDER_LABELS[login.provider] || login.provider} · {login.ip}
                        </p>
                      </div>
                      <time className="text-xs text-ink-300" dateTime={login.createdAt}>
                        {formatDateTime(login.createdAt)}
                      </time>
                    </li>
                  ))}
                </ul>
              )}
            </Section>

            <Section title="로그아웃" description="이 브라우저에서 로그아웃합니다.">
              <button
                type="button"
                onClick={async () => {
                  await logout()
                  window.location.href = '/'
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-ink-500/15 px-4 py-2 text-sm font-medium text-ink-400 hover:bg-ink-500/5"
              >
                <LogOut className="h-4 w-4" />
                로그아웃
              </button>
            </Section>
          </>
        )}
      </div>

      {pendingFile && (
        <AvatarEditor file={pendingFile} saving={savingAvatar} onCancel={() => setPendingFile(null)} onSave={saveAvatar} />
      )}
    </div>
  )
}

export default function AccountSettingsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen px-4 py-10 sm:py-14">
      <div className="mx-auto max-w-4xl">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-5 inline-flex items-center gap-1 text-sm text-ink-300 transition hover:text-ink-500"
        >
          <ChevronLeft className="h-4 w-4" />
          돌아가기
        </button>
        <h1 className="mb-7 text-2xl font-bold text-ink-500 sm:text-3xl">내 계정</h1>
        <Suspense fallback={<p className="py-24 text-center text-sm text-ink-300">불러오는 중입니다.</p>}>
          <AccountSettings />
        </Suspense>
      </div>
    </div>
  )
}
