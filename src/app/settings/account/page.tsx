'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  ChevronLeft,
  ExternalLink,
  Home,
  KeyRound,
  Link2,
  Lock,
  ShieldCheck,
  User,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
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
  { label: '계정 홈', caption: 'Google 계정 관리', path: '/', icon: Home, accent: 'coral' },
  { label: '개인정보', caption: '이름·이메일·프로필 사진', path: '/personal-info', icon: User, accent: 'sage' },
  { label: '보안', caption: '비밀번호·2단계 인증', path: '/security', icon: Lock, accent: 'mustard' },
  { label: '연결 관리', caption: '이 사이트 연결 해제 등', path: '/connections', icon: Link2, accent: 'coral' },
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
  const { isLoggedIn, user, openAccountCenter } = useAuth()

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
              <CaveatText className="text-lg text-coral-500">Google Account</CaveatText>
              <h1 className="display-han mt-1 text-3xl text-ink-500 sm:text-4xl">
                <InkUnderline variant="coral">내</InkUnderline> 계정 설정.
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-ink-300">
                로그인은 Google 계정으로 합니다. 이메일·비밀번호·프로필 사진은{' '}
                <strong className="font-bold text-ink-500">myaccount.google.com</strong>에서 관리돼요.
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
                  Google 계정으로 로그인하면 이 페이지에서 연결된 계정 정보를 볼 수 있어요.
                </p>

                <div className="mt-6">
                  <GoogleSignInButton callbackUrl="/settings/account" />
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
                    onClick={() => openAccountCenter('/')}
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
                    <Handwritten className="text-sage-500">accounts.google.com</Handwritten>
                  </dd>
                </div>
                <div className="flex flex-wrap gap-x-2">
                  <dt className="font-semibold text-ink-500">계정 설정</dt>
                  <dd className="break-all">
                    <Handwritten className="text-mustard-500">myaccount.google.com</Handwritten>
                  </dd>
                </div>
              </dl>

              <p className="mt-4 text-xs leading-relaxed text-ink-300">
                <KeyRound className="mr-1 inline h-3 w-3 align-[-2px] text-ink-300" />
                랑구팸과 이랑위키는 자체 세션만 유지하고, 인증은 Google 로그인(OpenID Connect)을 사용합니다. 기존 계정은 같은 이메일로 이어집니다.
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
