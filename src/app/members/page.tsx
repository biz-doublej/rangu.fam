'use client'

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Calendar, ArrowLeft, Sparkles, Users, Compass, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface Member {
  id: string
  rank: number
  name: string
  role: string
  description: string
  avatar?: string
  location?: string
  joinDate: Date
  cardCode: string
  keywords: string[]
  highlight: string
}

const accentGradients = [
  'from-emerald-500/60 via-emerald-400/40 to-sky-400/30',
  'from-indigo-500/60 via-purple-400/40 to-blue-400/30',
  'from-amber-400/60 via-orange-400/40 to-rose-400/30',
  'from-cyan-400/60 via-teal-400/40 to-emerald-300/30',
  'from-pink-500/60 via-fuchsia-400/40 to-violet-400/30'
]

const MEMBERS: Member[] = [
  {
    id: 'jaewon',
    rank: 27,
    name: '정재원',
    role: '소프트웨어 엔지니어, DoubleJ CEO',
    description: '코딩과 패션을 사랑하는 다재다능한 개발자입니다.',
    avatar: '/images/profile/jw.jpg',
    location: '서울, 대한민국',
    joinDate: new Date('2020-01-01'),
    cardCode: 'R27',
    keywords: ['개발', '패션', '기록'],
    highlight: '밤샘 코딩에도 스타일은 놓치지 않는다.'
  },
  {
    id: 'minseok',
    rank: 20,
    name: '정민석',
    role: 'IMI 재학생',
    description: '스위스에서 새로운 꿈을 키워가고 있습니다.',
    avatar: '/images/profile/ms.png',
    location: '취리히, 스위스',
    joinDate: new Date('2020-01-01'),
    cardCode: 'R20',
    keywords: ['유학', '루틴', '탐험'],
    highlight: '유럽 시간표 위에 새로운 꿈을 그리는 중.'
  },
  {
    id: 'jingyu',
    rank: 7,
    name: '정진규',
    role: '군 복무 중',
    description: '현재 군 복무 중이며, 전역 후 새로운 도전을 계획하고 있습니다.',
    avatar: '/images/profile/jq.jpg',
    location: '춘천, 대한민국',
    joinDate: new Date('2020-01-01'),
    cardCode: 'R7',
    keywords: ['훈련', '집중', '복귀'],
    highlight: '전역 후 다음 챕터를 위해 집중하는 단계.'
  },
  {
    id: 'hanul',
    rank: 17,
    name: '강한울',
    role: '철도차량시스템학과 진학 예정',
    description: '자유로운 영혼으로 다양한 취미와 관심사를 탐구합니다.',
    avatar: '/images/profile/hu.jpg',
    location: '서울, 대한민국',
    joinDate: new Date('2020-01-01'),
    cardCode: 'R17',
    keywords: ['취미', '실험', '영감'],
    highlight: '지금도 새로운 취미를 찾는 중.'
  },
  {
    id: 'seungchan',
    rank: 1,
    name: '이승찬',
    role: '마술사 & 호그와트 재학생',
    description: '마술과 마법을 통해 사람들에게 즐거움을 선사하는 마술사입니다.',
    avatar: '/images/profile/sc.jpg',
    location: '영국, 호그와트',
    joinDate: new Date('2025-01-21'),
    cardCode: 'R1',
    keywords: ['마법', '퍼포먼스', '스토리'],
    highlight: '카드 한 장에 마법을 담아 보여준다.'
  }
]

export default function MembersPage() {
  const router = useRouter()
  const [sortBy, setSortBy] = useState<'rank' | 'name'>('rank')

  const activeCount = useMemo(
    () => MEMBERS.length,
    []
  )

  const uniqueCities = useMemo(() => {
    const citySet = new Set<string>()
    MEMBERS.forEach(member => {
      if (member.location) {
        const primary = member.location.split(',')[0]?.trim()
        if (primary) citySet.add(primary)
      }
    })
    return citySet
  }, [])

  const sortedMembers = useMemo(() => {
    const copy = [...MEMBERS]
    return copy.sort((a, b) => {
      if (a.id === 'jaewon' && b.id !== 'jaewon') return -1
      if (b.id === 'jaewon' && a.id !== 'jaewon') return 1
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'ko-KR')
      }
      return a.rank - b.rank
    })
  }, [sortBy])

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
                다섯 친구의 개인 카드 컬렉션
              </div>
              <h1 className="text-3xl font-bold leading-tight text-white md:text-4xl">
                서로 다른 도시에서 이어지는 Rangu.fam 카드 아카이브
              </h1>
              <p className="text-sm text-slate-300 md:text-base">
                멤버들의 현재 위치, 근황, 합류 히스토리를 카드 형태로 정리했습니다.
                각 카드에 담긴 키워드와 하이라이트를 확인해 보세요.
              </p>
              <div className="flex flex-wrap gap-3 text-xs font-semibold text-slate-200">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">리더 + 4 크루</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">카드형 보관</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">하드코딩 컬렉션</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                className="glass-button px-5 py-3 text-sm font-semibold"
                onClick={() => setSortBy(sortBy === 'rank' ? 'name' : 'rank')}
              >
                {sortBy === 'rank' ? '이름순으로 보기' : '번호순으로 보기'}
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
                    <p className="text-xs uppercase tracking-wide text-slate-400">Members</p>
                    <p className="text-xl font-semibold text-white">{activeCount}명</p>
                    <p className="text-xs text-slate-400">등록된 멤버</p>
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
                    <p className="text-xl font-semibold text-white">{MEMBERS.length}명</p>
                    <p className="text-xs text-slate-400">멤버 카드 총계</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </motion.section>

        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedMembers.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
            >
              <Card className="relative h-full overflow-hidden border border-white/10 bg-white/5 shadow-2xl backdrop-blur">
                <div className={`absolute inset-0 bg-gradient-to-br ${accentGradients[index % accentGradients.length]} opacity-30`} />
                <CardContent className="relative flex h-full flex-col p-6">
                  <div className="flex items-start justify-between gap-3">
                    <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-emerald-100">
                      {member.id === 'jaewon' ? 'Leader' : 'Crew'}
                    </span>
                    <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-100">
                      {member.cardCode}
                    </div>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-[2rem] border border-white/15 bg-white/5">
                    <div className="relative aspect-[2/3] w-full">
                      {member.avatar && member.avatar !== '/images/default-avatar.jpg' ? (
                        <img
                          src={member.avatar}
                          alt={member.name}
                          className="absolute inset-0 h-full w-full object-cover"
                          onError={(e) => {
                            const target = e.currentTarget as HTMLElement
                            const fallback = target.nextElementSibling as HTMLElement
                            target.style.display = 'none'
                            if (fallback) fallback.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div className={`absolute inset-0 items-center justify-center text-3xl font-bold text-white ${member.avatar && member.avatar !== '/images/default-avatar.jpg' ? 'hidden' : 'flex'}`}>
                        {member.name.slice(0, 2)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div>
                      <h3 className="text-2xl font-semibold text-white">{member.name}</h3>
                      <p className="text-sm font-medium text-emerald-100/90">{member.role}</p>
                    </div>
                    <p className="text-sm text-slate-200/90 line-clamp-3">
                      {member.description}
                    </p>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-200 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.15em] text-slate-400">위치</p>
                      <div className="mt-1 flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-emerald-200" />
                        <span className="truncate">{member.location || '위치 정보 없음'}</span>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                      <p className="text-[11px] uppercase tracking-[0.15em] text-slate-400">합류일</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-emerald-200" />
                        <span>{formatDate.standard(member.joinDate)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-200">
                      {member.keywords.map(keyword => (
                        <span key={keyword} className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                          {keyword}
                        </span>
                      ))}
                      <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1">
                        합류 {formatDate.relative(member.joinDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-emerald-100/90">
                      <Sparkles className="h-4 w-4" />
                      <span>{member.highlight}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}

          {sortedMembers.length === 0 && (
            <Card className="col-span-2 border-white/10 bg-white/5">
              <CardContent className="py-12 text-center text-slate-200">
                아직 등록된 멤버 카드가 없습니다. 새로운 카드를 기다려주세요.
              </CardContent>
            </Card>
          )}
        </div>

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
