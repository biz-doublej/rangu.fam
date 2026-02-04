'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { Link2, ShieldCheck, Sparkles, UserCircle2, Unlink, LogIn } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'

interface AccountSession {
  id: string
  username: string
  role: 'member' | 'guest'
  discordId?: string | null
  discordUsername?: string | null
  discordAvatar?: string | null
  wikiUsername?: string | null
  memberId?: string | null
}

export default function AccountSettingsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isLoggedIn, user } = useAuth()
  const [session, setSession] = useState<AccountSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [unlinking, setUnlinking] = useState(false)

  const discordLinked = !!session?.discordId
  const memberLabel = useMemo(() => (session?.role === 'member' ? '멤버' : '게스트'), [session])

  const refreshSession = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/account/session', {
        credentials: 'include',
        cache: 'no-store',
      })

      if (!response.ok) {
        setSession(null)
        return
      }

      const data = await response.json()
      setSession(data.data || null)
    } catch (error) {
      console.error('계정 세션 조회 실패:', error)
      setSession(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false)
      return
    }
    refreshSession()
  }, [isLoggedIn])

  useEffect(() => {
    const linked = searchParams.get('discordLinked')
    const error = searchParams.get('discordError')

    if (linked === '1') {
      toast.success('Discord 계정이 연결되었습니다.')
      refreshSession()
      router.replace('/settings/account')
      return
    }

    if (error) {
      const messageMap: Record<string, string> = {
        already_linked: '이미 다른 계정에 연결된 Discord입니다.',
        invalid_request: '잘못된 Discord 연결 요청입니다.',
        link_failed: 'Discord 연결에 실패했습니다.',
        discord_not_configured: 'Discord 설정이 완료되지 않았습니다.',
      }
      toast.error(messageMap[error] || 'Discord 연결 중 오류가 발생했습니다.')
      router.replace('/settings/account')
    }
  }, [searchParams, router])

  const handleDiscordLink = () => {
    window.location.href = '/api/auth/discord/link/start?callbackUrl=/settings/account'
  }

  const handleDiscordUnlink = async () => {
    setUnlinking(true)
    try {
      const response = await fetch('/api/auth/discord/unlink', {
        method: 'POST',
        credentials: 'include',
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok || !data.success) {
        toast.error(data.error || 'Discord 연결 해제에 실패했습니다.')
        return
      }

      toast.success('Discord 연결이 해제되었습니다.')
      await refreshSession()
    } catch (error) {
      console.error('Discord 연결 해제 오류:', error)
      toast.error('Discord 연결 해제 중 오류가 발생했습니다.')
    } finally {
      setUnlinking(false)
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="max-w-lg w-full">
          <CardHeader>
            <h1 className="text-xl font-bold text-gray-800">계정 설정</h1>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            DoubleJ 통합 로그인이 필요합니다.
          </CardContent>
          <CardFooter>
            <Button type="button" variant="primary" className="w-full" onClick={() => router.push('/login')}>
              <LogIn className="w-4 h-4 mr-2" />
              로그인 페이지로 이동
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        계정 정보를 불러오는 중입니다...
      </div>
    )
  }

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
              하나의 계정으로 랑구팸과 이랑위키를 함께 사용합니다. Discord는 여기서 연결 후 간편로그인으로 사용할 수 있습니다.
            </p>
          </motion.div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card className="bg-white/5 border-white/10 text-white shadow-xl">
              <CardHeader>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <UserCircle2 className="w-4 h-4 text-primary-200" />
                  계정 상태
                </h2>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-white/80">
                <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
                  <p className="text-xs text-white/60 mb-1">아이디</p>
                  <p className="text-base font-semibold">{session?.username || user?.username || '-'}</p>
                </div>
                <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
                  <p className="text-xs text-white/60 mb-1">서비스 권한</p>
                  <p className="text-base font-semibold">{memberLabel}</p>
                  <p className="text-xs text-white/60 mt-1">지정된 다섯 멤버 외 계정은 게스트로 표시됩니다.</p>
                </div>
                <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
                  <p className="text-xs text-white/60 mb-1">이랑위키 계정</p>
                  <p className="text-base font-semibold">{session?.wikiUsername || '-'}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-black/30 border-white/10 shadow-xl">
              <CardHeader>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Link2 className="w-4 h-4 text-cyan-200" />
                  Discord 간편로그인 연결
                </h3>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-white/75">
                <div className="rounded-2xl bg-black/20 border border-white/10 p-4">
                  <p className="text-xs text-white/60 mb-1">현재 상태</p>
                  <p className="text-base font-semibold">
                    {discordLinked ? '연결됨' : '미연결'}
                  </p>
                  {discordLinked && (
                    <p className="text-xs text-white/60 mt-1">
                      {session?.discordUsername || session?.discordId}
                    </p>
                  )}
                </div>
                <p>
                  Discord 연결 후 로그인 페이지에서 <strong>Discord 간편로그인</strong> 버튼을 사용할 수 있습니다.
                </p>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                {!discordLinked ? (
                  <Button type="button" variant="primary" className="w-full" onClick={handleDiscordLink}>
                    <Link2 className="w-4 h-4 mr-2" />
                    Discord 연결하기
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full border border-white/20 text-white"
                    onClick={handleDiscordUnlink}
                    loading={unlinking}
                  >
                    <Unlink className="w-4 h-4 mr-2" />
                    Discord 연결 해제
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <h4 className="font-semibold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-200" />
                안내
              </h4>
            </CardHeader>
            <CardContent className="text-sm text-white/70 space-y-2">
              <p>• DoubleJ 통합 계정은 이랑위키와 랑구팸 사이트에 공통 적용됩니다.</p>
              <p>• 회원가입은 아이디/비밀번호로 진행하며, Discord 연결은 선택 사항입니다.</p>
              <p>• 권한은 지정된 다섯 멤버 외에는 게스트 권한으로 동작합니다.</p>
              <p>• Discord 간편로그인을 쓰려면 먼저 이 페이지에서 Discord 연결을 완료해주세요.</p>
              <p className="text-emerald-100/80 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                연결 후에는 로그인 화면에서 한 번에 들어올 수 있습니다.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
