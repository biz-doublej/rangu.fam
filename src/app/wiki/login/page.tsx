'use client'

import React, { Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { UserCircle } from 'lucide-react'
import { WikiShell, WikiPageHeader } from '@/components/wiki'
import { useAuth } from '@/contexts/AuthContext'
import { useWikiAuth } from '@/contexts/WikiAuthContext'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { getLoginErrorMessage } from '@/lib/loginErrors'

export default function WikiLoginPage() {
  return (
    <Suspense fallback={null}>
      <WikiLoginContent />
    </Suspense>
  )
}

function WikiLoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoggedIn, linkedWikiUsername } = useAuth()
  const { wikiUser, isLoading } = useWikiAuth()
  const errorMessage = getLoginErrorMessage(searchParams.get('error'))

  return (
    <WikiShell
      pageHeader={
        <WikiPageHeader
          title="이랑위키 로그인"
          subtitle="Google 계정으로 로그인합니다."
          hatnote={
            <>
              처음 로그인하면 계정이 자동으로 만들어집니다. 기존 회원은 같은 이메일의 Google 계정으로
              로그인하면 기존 계정과 기여 기록이 그대로 이어집니다.
            </>
          }
        />
      }
    >
      <section className="wiki-panel max-w-lg mx-auto">
        {errorMessage && (
          <p role="alert" className="wiki-mbox wiki-mbox--danger mb-4">
            {errorMessage}
          </p>
        )}

        <div className="flex items-start gap-3">
          <UserCircle className="w-6 h-6 text-[color:var(--wiki-accent)] mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-[color:var(--wiki-ink-soft)]">현재 연결된 위키 계정</p>
            <p className="text-base font-semibold text-[color:var(--wiki-ink)] mt-0.5">
              {linkedWikiUsername || wikiUser?.username || '로그인하지 않음'}
            </p>
          </div>
        </div>

        <hr className="wiki-divider" />

        {isLoggedIn ? (
          <button
            type="button"
            disabled={isLoading}
            onClick={() => router.push('/wiki')}
            className="w-full rounded-md bg-[color:var(--wiki-accent)] px-3 py-2 text-sm font-medium text-[#fff] hover:opacity-90 disabled:opacity-50"
          >
            위키로 이동
          </button>
        ) : (
          <div className="space-y-2">
            <GoogleSignInButton callbackUrl="/wiki" />
            <p className="text-xs text-[color:var(--wiki-ink-muted)] text-center">
              로그인이 끝나면 자동으로 위키로 돌아옵니다.
            </p>
          </div>
        )}
      </section>
    </WikiShell>
  )
}
