'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, UserCircle, UserPlus } from 'lucide-react'
import { WikiShell, WikiPageHeader } from '@/components/wiki'
import { useAuth } from '@/contexts/AuthContext'
import { useWikiAuth } from '@/contexts/WikiAuthContext'

export default function WikiLoginPage() {
  const router = useRouter()
  const { isLoggedIn, linkedWikiUsername, startSignIn, startSignUp } = useAuth()
  const { wikiUser, isLoading } = useWikiAuth()

  return (
    <WikiShell
      pageHeader={
        <WikiPageHeader
          title="이랑위키 로그인"
          subtitle="DoubleJ 통합 계정 플랫폼을 통해 안전하게 로그인합니다."
          hatnote={
            <>
              아직 계정이 없다면 <strong>통합 회원가입</strong>으로 무료 계정을 만들 수 있습니다.
              계정은 랑구팸 / 랑구대학과 공유됩니다.
            </>
          }
        />
      }
    >
      <section className="wiki-panel max-w-lg mx-auto">
        <div className="flex items-start gap-3">
          <UserCircle className="w-6 h-6 text-[color:var(--wiki-accent)] mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-[color:var(--wiki-ink-soft)]">
              현재 연결된 위키 계정
            </p>
            <p className="wiki-serif text-base font-semibold text-[color:var(--wiki-ink)] mt-0.5">
              {linkedWikiUsername || wikiUser?.username || '미연결'}
            </p>
          </div>
        </div>

        <hr className="wiki-divider" />

        {isLoggedIn ? (
          <button
            type="button"
            disabled={isLoading}
            onClick={() => router.push('/wiki')}
            className="w-full rounded-sm bg-[color:var(--wiki-accent)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            위키로 이동
          </button>
        ) : (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => startSignIn('/wiki')}
              className="w-full rounded-sm bg-[color:var(--wiki-accent)] px-3 py-2 text-sm font-medium text-white hover:opacity-90 inline-flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" /> 통합 로그인
            </button>
            <button
              type="button"
              onClick={() => startSignUp('/wiki')}
              className="w-full rounded-sm border border-[color:var(--wiki-rule-strong)] bg-[color:var(--wiki-bg-2)] px-3 py-2 text-sm font-medium text-[color:var(--wiki-ink-soft)] hover:border-[color:var(--wiki-accent)] inline-flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4" /> 통합 회원가입
            </button>
            <p className="text-[11px] text-[color:var(--wiki-ink-muted)] text-center">
              로그인이 끝나면 자동으로 <code>/wiki</code>로 돌아옵니다.
            </p>
          </div>
        )}
      </section>
    </WikiShell>
  )
}
