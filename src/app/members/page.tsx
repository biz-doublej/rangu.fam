'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Calendar, ArrowLeft, ArrowUpRight, Sparkles, Users, Compass, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface Member {
  id: string
  name: string
  role: string
  description: string
  avatar?: string
  email?: string
  status: string
  location?: string
  joinDate: Date
  personalPageUrl?: string
}

const statusBadge = (status: string) => {
  const base = 'px-3 py-1 rounded-full text-xs font-semibold border'
  switch (status) {
    case 'active':
      return `${base} bg-emerald-500/15 text-emerald-200 border-emerald-400/30`
    case 'idle':
      return `${base} bg-amber-500/15 text-amber-200 border-amber-400/30`
    case 'dnd':
      return `${base} bg-rose-500/15 text-rose-200 border-rose-400/30`
    default:
      return `${base} bg-slate-700/40 text-slate-200 border-slate-500/30`
  }
}

const accentGradients = [
  'from-emerald-500/60 via-emerald-400/40 to-sky-400/30',
  'from-indigo-500/60 via-purple-400/40 to-blue-400/30',
  'from-amber-400/60 via-orange-400/40 to-rose-400/30',
  'from-cyan-400/60 via-teal-400/40 to-emerald-300/30',
  'from-pink-500/60 via-fuchsia-400/40 to-violet-400/30'
]

export default function MembersPage() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent')

  useEffect(() => {
    loadMembers()
  }, [])

  const loadMembers = async () => {
    try {
      const response = await fetch('/api/members')
      if (response.ok) {
        const data = await response.json()
        setMembers(data)
      }
    } catch (error) {
      console.error('멤버 데이터 로딩 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const activeCount = useMemo(
    () => members.filter(member => member.status === 'active').length,
    [members]
  )

  const uniqueCities = useMemo(() => {
    const citySet = new Set<string>()
    members.forEach(member => {
      if (member.location) {
        const primary = member.location.split(',')[0]?.trim()
        if (primary) citySet.add(primary)
      }
    })
    return citySet
  }, [members])

  const sortedMembers = useMemo(() => {
    const copy = [...members]
    return copy.sort((a, b) => {
      if (a.id === 'jaewon' && b.id !== 'jaewon') return -1
      if (b.id === 'jaewon' && a.id !== 'jaewon') return 1

      if (sortBy === 'name') {
        return a.name.localeCompare(b.name)
      }

      return new Date(b.joinDate).getTime() - new Date(a.joinDate).getTime()
    })
  }, [members, sortBy])

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute -left-32 -top-24 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute right-[-8rem] top-20 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute inset-x-10 bottom-[-12rem] h-96 bg-gradient-to-r from-emerald-500/10 via-slate-800/30 to-indigo-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-20 border-b border-white/5 bg-slate-950/50 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <motion.button
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-100 transition hover:-translate-x-0.5 hover:border-emerald-400/40 hover:text-emerald-100"
            onClick={() => router.push('/')}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <ArrowLeft className="h-5 w-5" />
          </motion.button>
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.2em] text-emerald-200/80">
            <Sparkles className="h-4 w-4 text-emerald-300" />
            Rangu.fam Member Atlas
          </div>
          <div className="h-10 w-10" />
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-4 pb-16 pt-10">
        <motion.section
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-white/10 via-white/5 to-white/5 p-8 shadow-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(52,211,153,0.15),transparent_35%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(99,102,241,0.12),transparent_35%)]" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                <Sparkles className="h-4 w-4" />
                다섯 친구의 지금을 한눈에
              </div>
              <h1 className="text-3xl font-bold leading-tight text-white md:text-4xl">
                서로 다른 도시에서 이어지는 Rangu.fam의 스토리보드
              </h1>
              <p className="text-sm text-slate-300 md:text-base">
                멤버들의 현재 위치, 근황, 합류 히스토리를 정리한 새로운 멤버 아틀라스입니다.
                카드 하나하나를 눌러 각자의 개인 페이지로 바로 이동해 보세요.
              </p>
              <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-200">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">리더 + 4 크루</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">실시간 상태</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">업데이트형 레이아웃</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                className="glass-button px-5 py-3 text-sm font-semibold"
                onClick={() => setSortBy(sortBy === 'recent' ? 'name' : 'recent')}
              >
                {sortBy === 'recent' ? '이름순으로 보기' : '최근 합류순으로'}
              </Button>
              <Button
                variant="glass"
                className="px-5 py-3 text-sm font-semibold"
                onClick={() => router.push('/')}
              >
                메인으로
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 text-slate-200">
                  <Users className="h-9 w-9 rounded-2xl bg-emerald-500/15 p-2 text-emerald-200" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Active</p>
                    <p className="text-xl font-semibold text-white">{activeCount}명</p>
                    <p className="text-xs text-slate-400">지금 함께하는 크루</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 text-slate-200">
                  <Compass className="h-9 w-9 rounded-2xl bg-indigo-500/15 p-2 text-indigo-200" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Cities</p>
                    <p className="text-xl font-semibold text-white">{uniqueCities.size}곳</p>
                    <p className="text-xs text-slate-400">서로 다른 일상</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-white/10 bg-white/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 text-slate-200">
                  <Clock className="h-9 w-9 rounded-2xl bg-amber-500/15 p-2 text-amber-200" />
                  <div>
                    <p className="text-xs uppercase tracking-wide text-slate-400">Members</p>
                    <p className="text-xl font-semibold text-white">{members.length}명</p>
                    <p className="text-xs text-slate-400">멤버 페이지 총계</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.section>

        {isLoading ? (
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-64 animate-pulse rounded-3xl border border-white/5 bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {sortedMembers.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.05 }}
              >
                <Card className="relative overflow-hidden border border-white/10 bg-white/5 shadow-2xl backdrop-blur">
                  <div className={`absolute inset-0 bg-gradient-to-br ${accentGradients[index % accentGradients.length]} opacity-30`} />
                  <CardContent className="relative p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="relative h-16 w-16 overflow-hidden rounded-2xl border border-white/20 bg-white/10 ring-2 ring-white/10">
                          {member.avatar && member.avatar !== '/images/default-avatar.jpg' ? (
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="h-full w-full object-cover"
                              onError={(e) => {
                                const target = e.currentTarget as HTMLElement
                                const fallback = target.nextElementSibling as HTMLElement
                                target.style.display = 'none'
                                if (fallback) fallback.style.display = 'flex'
                              }}
                            />
                          ) : null}
                          <div className={`absolute inset-0 items-center justify-center text-lg font-bold text-white ${member.avatar && member.avatar !== '/images/default-avatar.jpg' ? 'hidden' : 'flex'}`}>
                            {member.name.slice(0, 2)}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-100">
                              {member.id === 'jaewon' ? 'Leader' : 'Crew'}
                            </span>
                            <span className={statusBadge(member.status)}>{member.status === 'active' ? '활성' : '오프라인'}</span>
                          </div>
                          <div>
                            <h3 className="text-xl font-semibold text-white">{member.name}</h3>
                            <p className="text-sm font-medium text-emerald-100/90">{member.role}</p>
                          </div>
                          <p className="text-sm text-slate-200/90 line-clamp-2">
                            {member.description}
                          </p>
                        </div>
                      </div>
                      <motion.button
                        className="rounded-full border border-white/15 bg-white/10 p-2 text-slate-100 transition hover:-translate-y-0.5 hover:border-emerald-300/40 hover:text-emerald-100"
                        onClick={() => router.push(member.personalPageUrl || `/members/${member.id}`)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.96 }}
                        aria-label={`${member.name} 프로필 보기`}
                      >
                        <ArrowUpRight className="h-5 w-5" />
                      </motion.button>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-200 sm:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-[0.15em] text-slate-400">위치</p>
                        <div className="mt-1 flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-emerald-200" />
                          <span className="truncate">{member.location || '위치 정보 없음'}</span>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-[0.15em] text-slate-400">가입일</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-emerald-200" />
                          <span>{formatDate.standard(member.joinDate)}</span>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-[0.15em] text-slate-400">리스트</p>
                        <div className="mt-1 flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-emerald-200" />
                          <span>프로필 열람 가능</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-200">
                        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                          {member.personalPageUrl ? '개인 페이지 연결됨' : '개인 페이지 준비 중'}
                        </span>
                        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                          합류 {formatDate.relative(member.joinDate)}
                        </span>
                      </div>
                      <Button
                        variant="glass"
                        className="px-4 py-2 text-sm"
                        onClick={() => router.push(member.personalPageUrl || `/members/${member.id}`)}
                      >
                        프로필 열기
                        <ArrowUpRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {sortedMembers.length === 0 && (
              <Card className="col-span-2 border-white/10 bg-white/5">
                <CardContent className="py-12 text-center text-slate-200">
                  아직 등록된 멤버가 없습니다. 새로운 프로필을 기다려주세요.
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <motion.section
          className="mt-14 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-8 shadow-xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex flex-col gap-3 text-slate-200 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Crew Note</p>
              <h3 className="text-xl font-semibold text-white">서로의 속도를 존중하며 함께 걷는 리더와 네 크루의 여정</h3>
              <p className="text-sm text-slate-300">
                각자의 도시, 각자의 페이스지만 우리는 같은 지도를 바라보고 있습니다.
                새로운 업데이트와 이야기가 쌓일 때마다 이 공간도 함께 진화합니다.
              </p>
            </div>
            <Button
              className="glass-button px-5 py-3 text-sm font-semibold"
              onClick={() => router.push('/members')}
            >
              멤버 허브로 이동
            </Button>
          </div>
        </motion.section>
      </main>
    </div>
  )
}
