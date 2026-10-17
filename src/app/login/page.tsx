'use client'

import React, { Suspense } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { CaveatText, Handwritten, InkUnderline, PaperCard, Pin, TapeStrip } from '@/components/scrapbook'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { getLoginErrorMessage } from '@/lib/loginErrors'
import Link from 'next/link'

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
  const { isLoggedIn, user } = useAuth()

  const errorMessage = getLoginErrorMessage(searchParams.get('error'))

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
            <CaveatText className="text-lg text-coral-500">Google ID</CaveatText>
            <h1 className="display-han mt-1 text-3xl text-ink-500 sm:text-4xl">
              <InkUnderline variant="coral">함께 쓰는</InkUnderline> 계정.
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-ink-300">
              Google 계정으로 로그인합니다. 처음이면 계정이 자동으로 만들어지고, 기존 회원은 같은 이메일의
              Google 계정으로 로그인하면 그대로 이어집니다.
            </p>

            {errorMessage && (
              <div className="mt-5 rounded-xl border border-coral-500/40 bg-coral-500/10 px-4 py-3 text-sm text-coral-600">
                {errorMessage}
              </div>
            )}

            <div className="mt-7">
              <GoogleSignInButton callbackUrl="/" />
            </div>
            <p className="mt-4 text-center text-xs leading-5 text-ink-300">
              로그인하면 <Link href="/terms" className="underline hover:text-coral-500">이용약관</Link>과{' '}
              <Link href="/privacy" className="underline hover:text-coral-500">개인정보처리방침</Link>에 동의하는 것으로 봅니다.
              Google 계정의 인증 정보는 계정 식별과 서비스 제공에 필요한 범위에서만 사용합니다.
            </p>
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
