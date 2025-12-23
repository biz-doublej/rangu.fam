'use client'

import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Music, Video, Bell, Settings, ShieldCheck, Users, LayoutDashboard } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

const serviceHighlights = [
  {
    title: '유튜브 & 음악 재생',
    description: '명령어 하나로 유튜브 영상이나 플레이리스트를 공용 채널에 띄워서 모두가 함께 감상할 수 있어요.',
    icon: Video
  },
  {
    title: '이벤트 알림',
    description: '정기/특별 이벤트를 슬랙처럼 알림으로 띄워주고, 리마인더 또는 반복 스케줄도 등록할 수 있어요.',
    icon: Bell
  },
  {
    title: '서버 전용 옵션',
    description: '랑구팸/이랑위키 용으로 커스터마이징된 설정만 노출해서 실수로 다른 서버에 유출되지 않아요.',
    icon: ShieldCheck
  },
  {
    title: '대시보드 중심 UX',
    description: '관리자는 설정을, 일반 유저는 기능을 각각 필요한 패널에서 바로 확인하고 조작할 수 있어요.',
    icon: LayoutDashboard
  }
]

const adminControls = [
  { title: '음악 채널 관리', detail: '큐 수정 · 자동 볼륨 설정 · 우선순위 역할', icon: Music },
  { title: '이벤트 스케줄', detail: '공지 · 임박 알림 · 반복 주기', icon: Bell },
  { title: '권한 잠금', detail: '로그인한 관리자만 봇 설정에 접근', icon: ShieldCheck },
  { title: '대시보드 테마', detail: '어두운/밝은/테마별 스킨 선택', icon: Settings }
]

const userActions = [
  { title: '음악 재생 명령', detail: '/play [유튜브 링크] 또는 /radio 로 곡 바로 재생', icon: Music },
  { title: '이벤트 확인', detail: '/events 로 다음 일정 훑기 · 핑 알림', icon: Bell },
  { title: '즐겨찾기 등록', detail: '선호하는 재생 목록을 대시보드에 고정', icon: Users },
  { title: '보고 싶은 영상 요청', detail: '대기 중인 영상 백로그를 확인 및 투표', icon: Video }
]

const upcomingEvents = [
  { title: '달빛 라운지 생방송', time: '오늘 22:00', status: '라이브 준비중' },
  { title: '이랑위키 정기 점검', time: '내일 12:30', status: '리마인더 전송' },
  { title: '음악 추천회 회의', time: '금요일 20:00', status: '참여 링크 공유' }
]

export default function RangiBotPage() {
  const { isLoggedIn, login, user } = useAuth()
  const [mode, setMode] = useState<'admin' | 'user'>('user')
  const [isBotAdmin, setIsBotAdmin] = useState<boolean | null>(null)
  const [adminError, setAdminError] = useState<string | null>(null)
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  useEffect(() => {
    let isMounted = true
    const controller = new AbortController()

    const checkAdmin = async () => {
      setAdminError(null)
      try {
        const response = await fetch('/api/rangi/admin', { signal: controller.signal })
        if (!response.ok) {
          throw new Error('관리자 권한 확인 실패')
        }
        const data = await response.json()
        if (isMounted) {
          setIsBotAdmin(Boolean(data?.isAdmin))
        }
      } catch (error) {
        if (isMounted) {
          setAdminError('관리자 권한 확인을 완료하지 못했습니다.')
          setIsBotAdmin(false)
        }
      }
    }

    checkAdmin()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [])

  useEffect(() => {
    if (isBotAdmin === false && mode === 'admin') {
      setMode('user')
    }
  }, [isBotAdmin, mode])

  useEffect(() => {
    if (isLoggedIn) {
      setIsLoggingIn(false)
    }
  }, [isLoggedIn])

  const handleLogin = async () => {
    if (isLoggingIn || isLoggedIn) return
    setIsLoggingIn(true)
    const success = await login()
    if (!success) {
      setIsLoggingIn(false)
    }
  }

  const adminButtonDisabled = isBotAdmin !== true
  const adminStatusText =
    isBotAdmin === null
      ? '관리자 권한 확인 중...'
      : isBotAdmin
        ? '디스코드 서버 관리자 인증됨'
        : '관리자 권한이 필요합니다.'
  const adminStatusClass =
    isBotAdmin === null ? 'text-slate-400' : isBotAdmin ? 'text-emerald-300' : 'text-rose-300'

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Rangu.fam</p>
            <h1 className="text-lg font-semibold text-white">랑이 대시보드</h1>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-300">
            <a href="/" className="hover:text-white">랑구팸</a>
            <a href="/wiki" className="hover:text-white">이랑위키</a>
            {isLoggedIn ? (
              <Button
                variant="ghost"
                size="sm"
                className="text-white"
                onClick={handleLogin}
              >
                @{user?.username || 'Discord'}
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-white"
                onClick={handleLogin}
                loading={isLoggingIn}
              >
                Discord 로그인
              </Button>
            )}
          </div>
        </div>
      </header>
      <section className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-900 via-slate-950 to-purple-950 px-6 py-16">
        <div className="max-w-6xl mx-auto flex flex-col gap-10 lg:flex-row lg:items-center">
          <div className="space-y-6">
            <p className="text-sm uppercase tracking-[0.4em] text-slate-300">신규봇 · 랑이 대시보드</p>
            <h1 className="text-4xl font-semibold leading-tight text-white lg:text-5xl">
              랑구팸/이랑위키 전용 디스코드 봇을 온라인에서 간단히 제어하세요
            </h1>
            <p className="text-base text-slate-300">
              관리자에게는 설정・권한 제어를, 일반 멤버에게는 음악/유튜브 재생, 이벤트 알림을 각기 맞춘 UI를 제공합니다. 서버 외부 노출 없이 안전하게 운영할 수 있는 대시보드입니다.
            </p>
            <div className="flex flex-wrap gap-3">
              {isLoggedIn ? (
                <Button
                  className="bg-amber-500 text-white"
                  variant="primary"
                  size="lg"
                  onClick={() => setMode(isBotAdmin ? 'admin' : 'user')}
                >
                  다이렉트 대시보드 보기
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  loading={isLoggingIn}
                  onClick={handleLogin}
                  className="bg-amber-500 text-white"
                >
                  디스코드 로그인
                </Button>
              )}
              <Button variant="glass" className="border border-white/40 text-white" size="lg">유저 기능 보기</Button>
            </div>
          </div>
          <div className="grid gap-5 w-full sm:grid-cols-2">
            {serviceHighlights.map(item => {
              const Icon = item.icon
              return (
                <Card key={item.title} className="bg-white/5 border border-white/10 p-5 text-sm text-slate-100" variant="glass">
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-white/10 p-2 text-amber-200">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs text-slate-400">서비스 하이라이트</p>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-300">{item.description}</p>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400">모드 전환</p>
            <h2 className="text-3xl font-semibold text-white">관리자 · 일반 멤버 각각 필요한 패널</h2>
          </div>
          <div className="flex gap-2">
            {isBotAdmin && (
              <button
                type="button"
                onClick={() => setMode('admin')}
                className={`rounded-full px-4 py-1 text-sm font-medium transition ${
                  mode === 'admin' ? 'bg-white text-slate-900' : 'border border-white/20 text-slate-300'
                }`}
              >
                관리자 대시보드
              </button>
            )}
            <button
              onClick={() => setMode('user')}
              className={`rounded-full px-4 py-1 text-sm font-medium transition ${mode === 'user' ? 'bg-white text-slate-900' : 'border border-white/20 text-slate-300'}`}
            >
              일반 유저 보기
            </button>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-300">
          {mode === 'admin'
            ? '관리자는 볼륨, 채널, 이벤트를 한 페이지에서 제어하며 모든 로그를 확인할 수 있어요.'
            : '멤버는 지금 재생중인 곡, 다음 이벤트 알림, 요청 대기열을 빠르게 확인합니다.'}
        </p>
        <p className={`mt-2 text-xs font-semibold ${adminStatusClass}`}>
          {adminStatusText}
          {adminError ? ` · ${adminError}` : ''}
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {(mode === 'admin' ? adminControls : userActions).map(item => {
            const Icon = item.icon
            return (
              <Card key={item.title} className="border border-white/10 bg-white/5 p-5" hover>
                <div className="flex items-start gap-3">
                  <span className="rounded-2xl bg-white/10 p-2 text-primary-200">
                    <Icon className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-300">{item.detail}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </section>

      <section className="bg-slate-900 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-16 space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.4em] text-slate-500">이벤트 알림</p>
              <p className="text-2xl font-semibold text-white">다가오는 일정과 알림</p>
              <p className="text-sm text-slate-400">
                리마인더는 디스코드 메시지와 대시보드 배너에 동시에 표시됩니다.
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              disabled={!isBotAdmin}
              title={!isBotAdmin ? '디스코드 관리자 권한이 필요합니다.' : undefined}
            >
              이벤트 추가
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {upcomingEvents.map(event => (
              <Card key={event.title} className="p-6 border border-white/10 bg-gradient-to-br from-white/5 to-white/0">
                <p className="text-xs text-slate-400">시간</p>
                <p className="text-sm font-semibold text-white">{event.time}</p>
                <p className="mt-3 text-lg font-semibold">{event.title}</p>
                <p className="mt-2 text-xs text-amber-300">{event.status}</p>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="p-6 border border-dashed border-white/20 bg-white/5">
              <p className="text-xs text-slate-400">관리자 가이드</p>
              <p className="mt-2 text-sm text-slate-200">
                봇 접속 토큰과 권한, 로깅 채널을 이 페이지에서 재확인하고 변경할 수 있어요.
              </p>
            </Card>
            <Card className="p-6 border border-dashed border-white/20 bg-white/5">
              <p className="text-xs text-slate-400">일반 유저 팁</p>
              <p className="mt-2 text-sm text-slate-200">
                /queue, /skip, /volume 명령어를 대시보드에 표시된 핫키로 빠르게 호출할 수 있어요.
              </p>
            </Card>
            <Card className="p-6 border border-dashed border-white/20 bg-white/5">
              <p className="text-xs text-slate-400">모바일 확인</p>
              <p className="mt-2 text-sm text-slate-200">
                라이트·다크 모드 전환과 알림 설정이 모두 모바일에서도 동기화됩니다.
              </p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
