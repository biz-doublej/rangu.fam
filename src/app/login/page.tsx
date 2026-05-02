'use client'

import React, { Suspense, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, ExternalLink, KeyRound, UserPlus } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'

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
      <div className="min-h-screen bg-slate-950 text-white px-4 py-16">
        <div className="max-w-2xl mx-auto">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <h1 className="text-2xl font-bold">DoubleJ 통합 로그인</h1>
              </CardHeader>
            <CardContent className="space-y-2 text-white/80">
              <p>
                <strong>{user?.username}</strong> 계정으로 로그인되어 있습니다.
              </p>
              <p>이랑위키와 랑구팸 서비스가 같은 계정으로 연결됩니다.</p>
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2">
              <Button type="button" variant="primary" onClick={() => router.push('/')}>
                홈으로 이동
              </Button>
              <Button type="button" variant="ghost" onClick={() => openAccountCenter('/account')}>
                계정센터 열기
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.push('/settings/account')}>
                계정 링크 보기
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#020617] text-white px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_45%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.12),transparent_40%)]" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="bg-slate-900/70 border-white/10">
          <CardHeader>
            <h1 className="text-2xl font-bold text-center">DoubleJ 통합 계정</h1>
          </CardHeader>
          <CardContent className="space-y-4">
            {errorMessage && (
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {errorMessage}
              </div>
            )}

            <p className="text-sm text-white/75">
              로그인/회원가입/계정설정은 <strong>accounts.doublej.app</strong>에서 통합 제공됩니다.
              아래 버튼을 누르면 서비스 인증 플로우(`/auth/start`)를 통해 자동 연동됩니다.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="primary"
                className="w-full"
                onClick={() => startSignIn('/')}
                disabled={isLoading}
              >
                <KeyRound className="w-4 h-4 mr-2" />
                로그인
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full border border-white/20 text-white"
                onClick={() => startSignUp('/')}
                disabled={isLoading}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                회원가입
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-2">
            <Button
              type="button"
              variant="ghost"
              className="w-full border border-white/20 text-white"
              onClick={() => openAccountCenter('/account')}
              disabled={isLoading}
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              계정센터 바로가기
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full border border-white/20 text-white"
              onClick={() => router.push('/auth/start?callbackUrl=%2F')}
              disabled={isLoading}
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              인증 시작 URL 열기
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}

function LoginPageFallback() {
  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-16">
      <div className="max-w-md mx-auto rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/70">
        로그인 화면을 불러오는 중입니다...
      </div>
    </div>
  )
}
