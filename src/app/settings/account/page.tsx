'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ExternalLink, LogIn, ShieldCheck, UserPlus } from 'lucide-react'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'

const ACCOUNT_LINKS = [
  { label: '계정 홈', path: '/account' },
  { label: '개인정보', path: '/account/personal-info' },
  { label: '보안', path: '/account/security' },
  { label: '연결 관리', path: '/account/connections' },
  { label: '결제', path: '/account/billing' },
]

export default function AccountSettingsPage() {
  const { isLoggedIn, user, startSignIn, startSignUp, openAccountCenter } = useAuth()

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-gradient-to-b from-[#050918] via-[#060312] to-[#020205]" />
      <div className="absolute -top-32 right-0 w-[32rem] h-[32rem] bg-primary-500/30 blur-[180px]" />
      <div className="absolute bottom-[-10rem] left-[-6rem] w-[28rem] h-[28rem] bg-cyan-500/20 blur-[160px]" />

      <div className="relative z-10 px-4 py-14 lg:py-16">
        <div className="max-w-4xl mx-auto space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl"
          >
            <p className="text-sm uppercase tracking-[0.3em] text-white/60 mb-2">DoubleJ Account Center</p>
            <h1 className="text-3xl lg:text-4xl font-bold mb-2">통합 계정 설정</h1>
            <p className="text-white/70">
              로그인/회원가입/계정설정은 `accounts.doublej.app`에서 통합 관리됩니다.
              이 페이지는 계정센터 이동 링크만 제공합니다.
            </p>
          </motion.div>

          {!isLoggedIn ? (
            <Card className="bg-white/5 border-white/10 text-white shadow-xl">
              <CardHeader>
                <h2 className="text-lg font-semibold">로그인이 필요합니다.</h2>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-white/80">
                <p>서비스 로그인은 `/auth/start`를 통해 OIDC(PKCE)로 시작됩니다.</p>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button type="button" variant="primary" className="w-full" onClick={() => startSignIn('/settings/account')}>
                  <LogIn className="w-4 h-4 mr-2" />
                  통합 로그인
                </Button>
                <Button type="button" variant="ghost" className="w-full border border-white/20 text-white" onClick={() => startSignUp('/settings/account')}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  통합 회원가입
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card className="bg-white/5 border-white/10 text-white shadow-xl">
              <CardHeader>
                <h2 className="text-lg font-semibold">{user?.username} 계정</h2>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {ACCOUNT_LINKS.map((link) => (
                  <button
                    key={link.path}
                    type="button"
                    onClick={() => openAccountCenter(link.path)}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 p-3 text-left hover:border-white/30 transition-colors"
                  >
                    <span className="flex items-center justify-between">
                      <span>{link.label}</span>
                      <ExternalLink className="w-4 h-4 text-white/60" />
                    </span>
                  </button>
                ))}
              </CardContent>
              <CardFooter>
                <Button type="button" variant="primary" className="w-full" onClick={() => openAccountCenter('/account')}>
                  <ArrowRight className="w-4 h-4 mr-2" />
                  계정센터 열기
                </Button>
              </CardFooter>
            </Card>
          )}

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <h4 className="font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-200" />
                연동 안내
              </h4>
            </CardHeader>
            <CardContent className="text-sm text-white/70 space-y-2">
              <p>• 서비스 로그인 시작: `/auth/start`</p>
              <p>• 인증 UI: `https://accounts.doublej.app/signin` / `https://accounts.doublej.app/signup`</p>
              <p>• 계정 설정: `https://accounts.doublej.app/account/*`</p>
              <p>• 랑구팸/이랑위키는 자체 세션만 유지하고 인증 소스는 DoubleJ 플랫폼을 사용합니다.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
