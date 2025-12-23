'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  LogIn,
  ArrowLeft,
  Link2,
  ShieldCheck,
  Sparkles,
  Activity,
  Info,
  UserCircle2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'

const benefits = [
  {
    icon: Link2,
    title: '기존 계정 연동',
    description: '계정 설정 페이지에서 예전 Rangu 아이디와 위키 계정을 연결할 수 있어요.',
  },
  {
    icon: ShieldCheck,
    title: '이랑위키 인증',
    description: '연동만 해두면 Discord 인증 한 번으로 위키 토큰을 바로 발급받을 수 있어요.',
  },
  {
    icon: Sparkles,
    title: '단일 로그인',
    description: '이제는 비밀번호 대신 Discord만으로 Rangu.fam과 이랑위키를 모두 이용해요.',
  },
]

const steps = [
  'Discord 버튼을 눌러 나타나는 인증 창에서 승인을 완료하세요.',
  '로그인 후 우측 상단의 이름을 눌러 계정 설정 페이지를 열 수 있어요.',
  '계정 설정에서 예전 아이디나 위키 계정을 연결하면 끝!',
]

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading, isLoggedIn, user } = useAuth()
  const [isRedirecting, setIsRedirecting] = useState(false)

  const handleDiscordLogin = async () => {
    setIsRedirecting(true)
    await login()
    setIsRedirecting(false)
  }

  const linkedMemberName = (user?.memberId && user?.username) ? user.username : (user?.username || null)

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#030617] text-white">
      <div className="absolute inset-0 bg-gradient-to-b from-[#040920] via-[#050414] to-[#02030b]" />
      <div className="absolute top-0 -right-10 w-[30rem] h-[30rem] bg-primary-500/30 blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-[28rem] h-[28rem] bg-purple-500/20 blur-[140px]" />

      <motion.button
        className="fixed top-6 left-6 glass-button p-3 z-20"
        onClick={() => router.push('/')}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        <ArrowLeft className="w-5 h-5 text-white" />
      </motion.button>

      <div className="relative z-10 px-4 py-16 lg:py-20">
        <div className="max-w-5xl mx-auto grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
          {/* Hero + CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <div className="space-y-4">
              <motion.div
                className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center shadow-2xl"
                animate={{ rotate: 360 }}
                transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
              >
                <LogIn className="w-10 h-10 text-white" />
              </motion.div>
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-white/60 mb-2">
                  Rangu.fam x 이랑위키
                </p>
                <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
                  디스코드 하나면
                  <br />모든 공간에 <span className="text-primary-300">접속 완료</span>
                </h1>
                <p className="mt-4 text-base text-white/80 leading-relaxed">
                  디스코드 인증을 통과하면 Rangu.fam과 이랑위키의 계정이 하나로 이어집니다. 인증 후에는
                  오른쪽 상단의 이름을 눌러 언제든지 계정 설정을 열 수 있어요.
                </p>
              </div>
            </div>

            <Card className="bg-white/5 border-white/10 shadow-2xl backdrop-blur-xl">
              <CardHeader>
                <h2 className="text-xl font-semibold text-white">Discord로 계속하기</h2>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3">
                  {benefits.map((item) => (
                    <div key={item.title} className="flex items-start space-x-3">
                      <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <item.icon className="w-5 h-5 text-primary-200" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{item.title}</p>
                        <p className="text-sm text-white/70">{item.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-3">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  loading={isLoading || isRedirecting}
                  className="w-full"
                  onClick={handleDiscordLogin}
                >
                  {isLoggedIn ? '다시 연결하기' : 'Discord로 계속하기'}
                </Button>
                <p className="text-sm text-white/60 text-center">
                  인증 후 우측 상단의 이름을 눌러 <span className="text-white font-semibold">계정 설정</span>
                  을 열 수 있어요.
                </p>
              </CardFooter>
            </Card>
          </motion.div>

          {/* Status + Info */}
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="bg-gradient-to-b from-white/80 to-white text-gray-800 shadow-2xl border-white/70">
              <CardHeader>
                <div className="flex items-center space-x-2 text-sm font-medium text-primary-600">
                  <Activity className="w-4 h-4" />
                  <span>연결 상태</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-2xl font-semibold text-gray-900">
                    {isLoggedIn ? '디스코드 인증 완료' : '아직 인증되지 않았어요'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {isLoggedIn
                      ? '이제 이름을 눌러 계정 설정으로 바로 이동할 수 있어요.'
                      : '버튼을 눌러 디스코드 인증을 완료해 주세요.'}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-100 p-4 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">현재 연결된 멤버</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {linkedMemberName || '연결된 멤버가 아직 없어요'}
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full border border-gray-200 text-gray-800 hover:bg-gray-100"
                  onClick={() => router.push('/settings/account')}
                >
                  계정 설정으로 이동
                </Button>
              </CardFooter>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Info className="w-4 h-4 text-primary-200" />
                  <h3 className="text-lg font-semibold text-white">로그인 안내</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <ul className="space-y-2 text-sm text-white/80">
                  {steps.map((step, idx) => (
                    <li key={step} className="flex items-start space-x-3">
                      <span className="w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs text-white">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <UserCircle2 className="w-4 h-4 text-primary-200" />
                  <h4 className="font-semibold text-white">도움말</h4>
                </div>
              </CardHeader>
              <CardContent className="text-sm text-white/70 space-y-2">
                <p>• 개인 계정 연동은 로그인 후 이름을 눌러 열리는 계정 설정에서 직접 진행하면 돼요.</p>
                <p>• 다른 사용자의 계정 연동은 이랑위키 관리자 페이지에서만 처리할 수 있습니다.</p>
                <p>• 계정 설정에서는 멤버 정보와 위키 계정을 한 번에 확인할 수 있어요.</p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
