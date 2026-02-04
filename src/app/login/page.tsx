'use client'

import React, { Suspense, useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter, useSearchParams } from 'next/navigation'
import { Link2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'

const ERROR_MESSAGES: Record<string, string> = {
  discord_not_linked: '회원가입된 계정에 연결된 Discord를 찾지 못했습니다. 먼저 통합 회원가입 후 계정 설정에서 Discord를 연결해주세요.',
  discord_auth_failed: 'Discord 인증에 실패했습니다. 잠시 후 다시 시도해주세요.',
  discord_not_configured: 'Discord 로그인 설정이 아직 완료되지 않았습니다.',
  account_inactive: '비활성화된 계정입니다.',
  account_banned: '차단된 계정입니다.',
  login_required: '먼저 통합 로그인이 필요합니다.',
  session_expired: '세션이 만료되었습니다. 다시 로그인해주세요.',
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
  const { login, register, loginWithDiscord, isLoading, isLoggedIn, user } = useAuth()

  const [form, setForm] = useState({ username: '', password: '' })
  const [rememberId, setRememberId] = useState(false)

  const errorCode = searchParams.get('error')
  const errorMessage = useMemo(() => {
    if (!errorCode) return null
    return ERROR_MESSAGES[errorCode] || '로그인 중 오류가 발생했습니다.'
  }, [errorCode])

  useEffect(() => {
    const savedId = localStorage.getItem('doublej.savedUsername')
    if (savedId) {
      setForm((prev) => ({ ...prev, username: savedId }))
      setRememberId(true)
    }
  }, [])

  const persistRememberId = (username: string) => {
    if (rememberId) {
      localStorage.setItem('doublej.savedUsername', username)
      return
    }
    localStorage.removeItem('doublej.savedUsername')
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await login(form.username, form.password)
    if (success) {
      persistRememberId(form.username)
      router.push('/')
    }
  }

  const handleRegister = async () => {
    const success = await register(form.username, form.password)
    if (success) {
      persistRememberId(form.username)
      router.push('/')
    }
  }

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
            <CardFooter className="flex gap-2">
              <Button type="button" variant="primary" onClick={() => router.push('/')}>
                홈으로 이동
              </Button>
              <Button type="button" variant="ghost" onClick={() => router.push('/settings/account')}>
                계정 설정
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
            <h1 className="text-2xl font-bold text-center">DoubleJ 통합 로그인</h1>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {errorMessage && (
                <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {errorMessage}
                </div>
              )}

              <label className="block text-sm text-white/70">아이디</label>
              <Input
                type="text"
                value={form.username}
                onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="아이디"
                className="bg-black/20 border-white/20 text-white placeholder:text-white/40"
              />

              <label className="block text-sm text-white/70">비밀번호</label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="비밀번호"
                className="bg-black/20 border-white/20 text-white placeholder:text-white/40"
              />

              <label className="flex items-center gap-2 text-sm text-white/75">
                <input
                  type="checkbox"
                  checked={rememberId}
                  onChange={(e) => setRememberId(e.target.checked)}
                  className="h-4 w-4 rounded border-white/30 bg-transparent"
                />
                아이디 저장
              </label>

              <div className="grid grid-cols-2 gap-2">
                <Button type="submit" variant="primary" className="w-full" loading={isLoading}>
                  로그인
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full border border-white/20 text-white"
                  onClick={handleRegister}
                  disabled={isLoading}
                >
                  회원가입
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter>
            <Button
              type="button"
              variant="ghost"
              className="w-full border border-white/20 text-white"
              onClick={() => loginWithDiscord('/')}
              disabled={isLoading}
            >
              <Link2 className="w-4 h-4 mr-2" />
              간편로그인 (Discord)
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
