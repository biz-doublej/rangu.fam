'use client'

import React, { Suspense, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, ExternalLink, KeyRound, UserPlus, ChevronLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { CaveatText, Handwritten, InkUnderline, PaperCard, Pin, TapeStrip } from '@/components/scrapbook'

const ERROR_MESSAGES: Record<string, string> = {
  oidc_not_configured: '현재 서비스 OIDC 설정이 누락되었습니다. 관리자에게 OIDC_CLIENT_ID/OIDC_CLIENT_SECRET 설정을 요청해주세요.',
  oidc_start_failed: '로그인 시작 처리에 실패했습니다. 잠시 후 다시 시도해주세요.',
  oidc_authorize_failed: '인증 서버에서 로그인이 취소되었거나 실패했습니다.',
  invalid_oauth_callback: '로그인 응답이 올바르지 않습니다. 다시 시도해주세요.',
  state_missing: '로그인 세션이 만료되었습니다. 다시 로그인해주세요.',
  state_mismatch: '보안 검증(state)이 일치하지 않습니다. 다시 로그인해주세요.',
  identity_not_found: '계정 정보를 확인하지 못했습니다.',
  session_sync_failed: '서비스 세션 생성에 실패했습니다.',
  oidc_callback_failed: '로그인 콜백 처리 중 오류가 발생했습니다.',
  account_inactive: '비활성화된 계정입니다.',
  account_banned: '차단된 계정입니다.',
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  )
}

function LoginPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { startSignIn, startSignUp, openAccountCenter, isLoading, isLoggedIn, user } = useAuth()

  const errorCode = searchParams.get('error')
  const errorMessage = useMemo(() => {
    if (!errorCode) return null
    return ERROR_MESSAGES[errorCode] || '로그인 중 오류가 발생했습니다.'
  }, [errorCode])

  if (isLoggedIn) {
    return (
      <div className="min-h-screen px-4 py-16">
        <div className="mx-auto max-w-2xl">
          <button
            onClick={() => router.push('/')}
            className="mb-6 inline-flex items-center gap-1 text-sm text-ink-300 hover:text-ink-500"
          >
            <ChevronLeft className="h-4 w-4" />
            홈으로
          </button>
          <PaperCard className="!p-8">
            <div className="flex items-start justify-between">
              <div>
                <CaveatText className="text-xl text-coral-500">already in</CaveatText>
                <h1 className="display-han mt-1 text-3xl text-ink-500">잘 들어오셨어요.</h1>
              </div>
              <Pin color="sage" />
            </div>
            <p className="mt-6 text-base leading-relaxed text-ink-300">
              <Handwritten className="text-coral-500">{user?.username}</Handwritten> 계정으로
              로그인되어 있어요. 이랑위키와 랑구팸이 같은 계정으로 연결됩니다.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              <button onClick={() => router.push('/')} className="ink-button">
                홈으로 이동
              </button>
              <button onClick={() => openAccountCenter('/account')} className="ghost-button">
                <ExternalLink className="h-4 w-4" />
                계정센터 열기
              </button>
              <button onClick={() => router.push('/settings/account')} className="ghost-button">
                계정 링크 보기
              </button>
            </div>
          </PaperCard>
        </div>
      </div>
    )
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative w-full max-w-md"
      >
        <div className="absolute -left-6 -top-6 hidden md:block">
          <CaveatText className="text-2xl text-coral-500">come on in →</CaveatText>
        </div>

        <PaperCard className="relative !p-0 overflow-visible">
          <TapeStrip className="tape--top" color="coral" />

          <div className="px-7 pb-7 pt-9 sm:px-9 sm:pb-9">
            <CaveatText className="text-lg text-coral-500">DoubleJ ID</CaveatText>
            <h1 className="display-han mt-1 text-3xl text-ink-500 sm:text-4xl">
              <InkUnderline variant="coral">함께 쓰는</InkUnderline> 계정.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-300">
              로그인·회원가입·계정설정은 모두 <strong className="font-bold text-ink-500">accounts.doublej.app</strong>에서
              통합 제공됩니다. 아래 버튼을 누르면 자동으로 연결돼요.
            </p>

            {errorMessage && (
              <div className="mt-5 rounded-xl border border-coral-500/40 bg-coral-500/10 px-4 py-3 text-sm text-coral-600">
                {errorMessage}
              </div>
            )}

            <div className="mt-7 grid grid-cols-2 gap-2">
              <button
                type="button"
                className="ink-button justify-center"
                onClick={() => startSignIn('/')}
                disabled={isLoading}
              >
                <KeyRound className="h-4 w-4" />
                로그인
              </button>
              <button
                type="button"
                className="ghost-button justify-center"
                onClick={() => startSignUp('/')}
                disabled={isLoading}
              >
                <UserPlus className="h-4 w-4" />
                회원가입
              </button>
            </div>

            <div className="mt-6 space-y-2 border-t border-dashed border-ink-500/15 pt-5">
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-ink-300 transition hover:bg-ink-500/5 hover:text-ink-500"
                onClick={() => openAccountCenter('/account')}
                disabled={isLoading}
              >
                <span className="inline-flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  계정센터 바로가기
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-ink-300 transition hover:bg-ink-500/5 hover:text-ink-500"
                onClick={() => router.push('/auth/start?callbackUrl=%2F')}
                disabled={isLoading}
              >
                <span className="inline-flex items-center gap-2">
                  <ArrowRight className="h-4 w-4" />
                  /auth/start 직접 열기
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </PaperCard>

        <p className="mt-6 text-center text-xs text-ink-300">
          <CaveatText className="text-base">— rangu.fam, 2026</CaveatText>
        </p>
      </motion.div>
    </div>
  )
}

function LoginPageFallback() {
  return (
    <div className="min-h-screen px-4 py-16">
      <div className="mx-auto max-w-md rounded-2xl border border-paper-300 bg-paper-50 p-6 text-center text-ink-300">
        로그인 화면을 불러오는 중입니다…
      </div>
    </div>
  )
}
