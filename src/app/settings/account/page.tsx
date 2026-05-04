'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  ChevronLeft,
  CreditCard,
  ExternalLink,
  Home,
  KeyRound,
  Link2,
  Lock,
  LogIn,
  ShieldCheck,
  User,
  UserPlus,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import {
  CaveatText,
  Handwritten,
  InkUnderline,
  PaperCard,
  Pin,
  TapeStrip,
} from '@/components/scrapbook'

type LinkAccent = 'coral' | 'sage' | 'mustard'

const ACCOUNT_LINKS: Array<{
  label: string
  caption: string
  path: string
  icon: React.ComponentType<{ className?: string }>
  accent: LinkAccent
}> = [
  { label: '계정 홈', caption: '한눈에 보는 통합 계정', path: '/account', icon: Home, accent: 'coral' },
  { label: '개인정보', caption: '이름·이메일·아바타', path: '/account/personal-info', icon: User, accent: 'sage' },
  { label: '보안', caption: '비밀번호·2단계 인증', path: '/account/security', icon: Lock, accent: 'mustard' },
  { label: '연결 관리', caption: '서드파티 앱·서비스', path: '/account/connections', icon: Link2, accent: 'coral' },
  { label: '결제', caption: '구독·결제수단', path: '/account/billing', icon: CreditCard, accent: 'sage' },
]

const accentToTextClass: Record<LinkAccent, string> = {
  coral: 'text-coral-500',
  sage: 'text-sage-500',
  mustard: 'text-mustard-500',
}

const accentToBgClass: Record<LinkAccent, string> = {
  coral: 'bg-coral-500/10',
  sage: 'bg-sage-500/10',
  mustard: 'bg-mustard-500/10',
}

export default function AccountSettingsPage() {
  const router = useRouter()
  const { isLoggedIn, user, isLoading, startSignIn, startSignUp, openAccountCenter } = useAuth()

  return (
    <div className="min-h-screen px-4 py-12 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="mb-6 inline-flex items-center gap-1 text-sm text-ink-300 transition hover:text-ink-500"
        >
          <ChevronLeft className="h-4 w-4" />
          홈으로
        </button>

        {/* ── 헤더 카드 ─────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative"
        >
          <div className="absolute -left-3 -top-4 hidden md:block">
            <CaveatText className="text-xl text-coral-500">your account →</CaveatText>
          </div>

          <PaperCard className="relative !p-0 overflow-visible">
            <TapeStrip className="tape--top" color="coral" />
            <div className="px-7 pb-7 pt-9 sm:px-9 sm:pb-9">
              <CaveatText className="text-lg text-coral-500">DoubleJ Account Center</CaveatText>
              <h1 className="display-han mt-1 text-3xl text-ink-500 sm:text-4xl">
                <InkUnderline variant="coral">통합</InkUnderline> 계정 설정.
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-ink-300">
                로그인·회원가입·계정설정은 모두{' '}
                <strong className="font-bold text-ink-500">accounts.doublej.app</strong>에서 통합 관리됩니다.
                이 페이지는 계정센터 이동 링크만 제공해요.
              </p>
            </div>
          </PaperCard>
        </motion.div>

        {/* ── 본문: 로그인 상태에 따라 ─────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="mt-6"
        >
          {!isLoggedIn ? (
            <PaperCard className="relative !p-0 overflow-visible">
              <TapeStrip className="tape--top" color="sage" />
              <div className="px-7 pb-7 pt-9 sm:px-9 sm:pb-9">
                <div className="flex items-start justify-between">
                  <div>
                    <CaveatText className="text-lg text-sage-500">sign in first</CaveatText>
                    <h2 className="display-han mt-1 text-2xl text-ink-500">
                      로그인이 필요해요.
                    </h2>
                  </div>
                  <Pin color="sage" />
                </div>
                <p className="mt-4 text-sm leading-relaxed text-ink-300">
                  서비스 로그인은 <Handwritten className="text-coral-500">/auth/start</Handwritten> 를 통해
                  OIDC(PKCE) 흐름으로 시작됩니다.
                </p>

                <div className="mt-6 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className="ink-button justify-center"
                    onClick={() => startSignIn('/settings/account')}
                    disabled={isLoading}
                  >
                    <LogIn className="h-4 w-4" />
                    로그인
                  </button>
                  <button
                    type="button"
                    className="ghost-button justify-center"
                    onClick={() => startSignUp('/settings/account')}
                    disabled={isLoading}
                  >
                    <UserPlus className="h-4 w-4" />
                    회원가입
                  </button>
                </div>
              </div>
            </PaperCard>
          ) : (
            <PaperCard className="relative !p-0 overflow-visible">
              <TapeStrip className="tape--top" color="sage" />
              <div className="px-7 pb-7 pt-9 sm:px-9 sm:pb-9">
                <div className="flex items-start justify-between">
                  <div>
                    <CaveatText className="text-lg text-sage-500">signed in as</CaveatText>
                    <h2 className="display-han mt-1 text-2xl text-ink-500">
                      <Handwritten className="text-coral-500">{user?.username}</Handwritten> 계정
                    </h2>
                  </div>
                  <Pin color="coral" />
                </div>

                <ul className="mt-6 space-y-2">
                  {ACCOUNT_LINKS.map((link) => {
                    const Icon = link.icon
                    return (
                      <li key={link.path}>
                        <button
                          type="button"
                          onClick={() => openAccountCenter(link.path)}
                          className="group flex w-full items-center gap-3 rounded-xl border border-ink-500/10 bg-paper-50/60 px-4 py-3 text-left transition hover:border-ink-500/25 hover:bg-paper-50"
                        >
                          <span
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${accentToBgClass[link.accent]}`}
                          >
                            <Icon className={`h-4 w-4 ${accentToTextClass[link.accent]}`} />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block text-sm font-medium text-ink-500">{link.label}</span>
                            <span className="block text-xs text-ink-300">{link.caption}</span>
                          </span>
                          <ExternalLink className="h-4 w-4 shrink-0 text-ink-300 transition group-hover:text-ink-500" />
                        </button>
                      </li>
                    )
                  })}
                </ul>

                <div className="mt-6 border-t border-dashed border-ink-500/15 pt-5">
                  <button
                    type="button"
                    className="ink-button w-full justify-center"
                    onClick={() => openAccountCenter('/account')}
                  >
                    <ArrowRight className="h-4 w-4" />
                    계정센터 열기
                  </button>
                </div>
              </div>
            </PaperCard>
          )}
        </motion.div>

        {/* ── 연동 안내 카드 (노트지) ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-6"
        >
          <PaperCard lined className="relative !p-0 overflow-visible">
            <TapeStrip className="tape--top" color="yellow" />
            <div className="px-7 pb-7 pt-9 sm:px-9 sm:pb-9">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-sage-500" />
                <CaveatText className="text-base text-ink-500">연동 안내</CaveatText>
              </div>

              <dl className="mt-4 space-y-2 text-sm leading-relaxed text-ink-300">
                <div className="flex flex-wrap gap-x-2">
                  <dt className="font-semibold text-ink-500">서비스 로그인 시작</dt>
                  <dd>
                    <Handwritten className="text-coral-500">/auth/start</Handwritten>
                  </dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="font-semibold text-ink-500">인증 UI</dt>
                  <dd className="break-all">
                    <Handwritten className="text-sage-500">accounts.doublej.app/signin</Handwritten>
                    <span className="mx-1 text-ink-300">·</span>
                    <Handwritten className="text-sage-500">/signup</Handwritten>
                  </dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="font-semibold text-ink-500">계정 설정</dt>
                  <dd className="break-all">
                    <Handwritten className="text-mustard-500">accounts.doublej.app/account/*</Handwritten>
                  </dd>
                </div>
              </dl>

              <p className="mt-4 text-xs leading-relaxed text-ink-300">
                <KeyRound className="mr-1 inline h-3 w-3 align-[-2px] text-ink-300" />
                랑구팸과 이랑위키는 자체 세션만 유지하고, 인증 소스는 DoubleJ 플랫폼을 사용합니다.
              </p>
            </div>
          </PaperCard>
        </motion.div>

        <p className="mt-8 text-center text-xs text-ink-300">
          <CaveatText className="text-base">— rangu.fam, 2026</CaveatText>
        </p>
      </div>
    </div>
  )
}
