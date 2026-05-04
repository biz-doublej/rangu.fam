'use client'

import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { ChevronLeft, MapPin, Calendar, ArrowRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { memberSiteUrl, type MemberSlug } from '@/config/memberSites'
import {
  Polaroid,
  PaperCard,
  Handwritten,
  CaveatText,
  InkUnderline,
  TapeStrip,
  Pin,
  DoodleArrow,
} from '@/components/scrapbook'

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
  rotate: 'left' | 'right' | 'extra'
  tape: 'top' | 'top-left' | 'top-right'
  tapeColor: 'yellow' | 'coral' | 'sage'
}

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
    highlight: '밤샘 코딩에도 스타일은 놓치지 않는다.',
    rotate: 'left',
    tape: 'top-left',
    tapeColor: 'coral',
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
    highlight: '유럽 시간표 위에 새로운 꿈을 그리는 중.',
    rotate: 'right',
    tape: 'top-right',
    tapeColor: 'sage',
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
    highlight: '전역 후 다음 챕터를 위해 집중하는 단계.',
    rotate: 'extra',
    tape: 'top',
    tapeColor: 'yellow',
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
    highlight: '지금도 새로운 취미를 찾는 중.',
    rotate: 'left',
    tape: 'top-right',
    tapeColor: 'coral',
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
    highlight: '카드 한 장에 마법을 담아 보여준다.',
    rotate: 'right',
    tape: 'top-left',
    tapeColor: 'yellow',
  },
]

export default function MembersPage() {
  const router = useRouter()
  const [sortBy, setSortBy] = useState<'rank' | 'name'>('rank')

  const uniqueCities = useMemo(() => {
    const set = new Set<string>()
    MEMBERS.forEach((m) => {
      if (m.location) {
        const primary = m.location.split(',')[0]?.trim()
        if (primary) set.add(primary)
      }
    })
    return set
  }, [])

  const sortedMembers = useMemo(() => {
    const copy = [...MEMBERS]
    return copy.sort((a, b) => {
      if (a.id === 'jaewon' && b.id !== 'jaewon') return -1
      if (b.id === 'jaewon' && a.id !== 'jaewon') return 1
      if (sortBy === 'name') return a.name.localeCompare(b.name, 'ko-KR')
      return a.rank - b.rank
    })
  }, [sortBy])

  return (
    <div className="min-h-screen pb-16">
      {/* ── Top bar ── */}
      <div className="border-b border-dashed border-ink-500/15 bg-paper-50/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-1 text-sm text-ink-300 hover:text-ink-500"
          >
            <ChevronLeft className="h-4 w-4" />
            홈으로
          </button>
          <CaveatText className="text-lg text-coral-500">members atlas</CaveatText>
          <button
            onClick={() => setSortBy(sortBy === 'rank' ? 'name' : 'rank')}
            className="ghost-button text-xs"
          >
            {sortBy === 'rank' ? '이름순' : '번호순'}
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* ── Hero ── */}
        <section className="relative py-14 lg:py-20">
          <div className="grid gap-8 lg:grid-cols-[1.2fr,1fr] lg:items-center">
            <div className="space-y-5">
              <CaveatText className="text-xl text-coral-500">cast & crew · vol.27</CaveatText>
              <h1 className="scrap-h1">
                다섯 도시,<br />
                <InkUnderline variant="mustard">다섯 친구</InkUnderline>의<br />
                지금.
              </h1>
              <p className="max-w-md text-base leading-relaxed text-ink-300">
                각자의 자리에서 각자의 속도로 살아갑니다.
                같은 지도를 보고 있다는 것만은 변하지 않아요.
              </p>

              <div className="flex flex-wrap gap-2 pt-2">
                <span className="pill-tag pill-tag--coral">{MEMBERS.length}명</span>
                <span className="pill-tag pill-tag--sage">{uniqueCities.size}도시</span>
                <span className="pill-tag pill-tag--mustard">2020 –&nbsp;</span>
              </div>
            </div>

            <div className="relative hidden h-72 lg:block">
              {/* decorative collage */}
              <div className="absolute left-0 top-0">
                <Polaroid src={MEMBERS[0].avatar!} alt="" rotate="left" tape="top-left" tapeColor="coral" width={170} height={210} aspect="portrait" />
              </div>
              <div className="absolute right-0 top-6">
                <Polaroid src={MEMBERS[1].avatar!} alt="" rotate="right" tape="top-right" tapeColor="sage" width={170} height={210} aspect="portrait" />
              </div>
              <div className="absolute bottom-0 left-1/3">
                <Polaroid src={MEMBERS[4].avatar!} alt="" rotate="extra" tape="top" tapeColor="yellow" width={170} height={210} aspect="portrait" />
              </div>
              <DoodleArrow direction="down-right" className="absolute right-12 top-12 text-ink-300" />
            </div>
          </div>
        </section>

        {/* ── Map of cities ── */}
        <section className="border-t border-dashed border-ink-500/15 py-12">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <CaveatText className="text-lg text-coral-500">where we are</CaveatText>
              <h2 className="scrap-h2 mt-1">다섯 도시의 좌표</h2>
            </div>
            <CaveatText className="hidden text-base text-ink-300 sm:block">↓ each pin = each friend</CaveatText>
          </div>

          <PaperCard className="paper-card--lined !p-6 sm:!p-10">
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {MEMBERS.map((m) => {
                const city = m.location?.split(',')[0]?.trim() || '—'
                const country = m.location?.split(',')[1]?.trim() || ''
                return (
                  <li key={m.id} className="relative pt-3">
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                      <Pin color={m.tapeColor === 'coral' ? 'coral' : m.tapeColor === 'sage' ? 'sage' : 'mustard'} />
                    </div>
                    <div className="rounded-2xl border border-dashed border-ink-500/20 bg-paper-50/60 p-4 text-center">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-ink-300">{m.cardCode}</p>
                      <p className="display-han mt-1 text-xl text-ink-500">{city}</p>
                      <p className="text-[11px] text-ink-300">{country}</p>
                      <p className="caveat mt-2 text-base text-coral-500">{m.name}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </PaperCard>
        </section>

        {/* ── Member cards ── */}
        <section className="border-t border-dashed border-ink-500/15 py-12">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <CaveatText className="text-lg text-coral-500">cards</CaveatText>
              <h2 className="scrap-h2 mt-1">멤버 카드 컬렉션</h2>
            </div>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-12 lg:grid-cols-3">
            {sortedMembers.map((m, i) => {
              const url = memberSiteUrl(m.id as MemberSlug)
              return (
              <motion.article
                key={m.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="relative"
              >
                {/* polaroid (clickable when member has a site) */}
                <a
                  href={url || '#'}
                  className={`block mx-auto ${url ? 'group' : 'pointer-events-none'}`}
                  style={{ maxWidth: 280 }}
                >
                  <div
                    className={`polaroid polaroid--rot-${m.rotate === 'left' ? 'l' : m.rotate === 'right' ? 'r' : 'xl'} ${url ? 'transition-transform group-hover:!translate-y-[-4px] group-hover:!rotate-0' : ''}`}
                  >
                    <TapeStrip
                      className={
                        m.tape === 'top-left'
                          ? 'tape--top-left'
                          : m.tape === 'top-right'
                          ? 'tape--top-right'
                          : 'tape--top'
                      }
                      color={m.tapeColor}
                    />
                    <div className="polaroid-photo aspect-[3/4] bg-paper-200">
                      {m.avatar ? (
                        <img src={m.avatar} alt={m.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-3xl text-ink-300">
                          {m.name.slice(0, 2)}
                        </div>
                      )}
                    </div>
                    <div className="polaroid-caption">
                      {m.cardCode} · {m.name}
                    </div>
                  </div>
                </a>

                {/* details */}
                <div className="mt-6 space-y-3 text-center sm:text-left sm:px-2">
                  <div>
                    <h3 className="display-han text-2xl text-ink-500">{m.name}</h3>
                    <p className="text-sm font-medium text-coral-500">{m.role}</p>
                  </div>

                  <p className="text-sm leading-relaxed text-ink-300">{m.description}</p>

                  <div className="flex flex-wrap justify-center gap-2 pt-1 sm:justify-start">
                    {m.keywords.map((k) => (
                      <span key={k} className="pill-tag">
                        {k}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-col gap-1.5 border-t border-dashed border-ink-500/15 pt-3 text-xs text-ink-300">
                    <span className="inline-flex items-center justify-center gap-1.5 sm:justify-start">
                      <MapPin className="h-3.5 w-3.5 text-coral-500" />
                      {m.location || '위치 정보 없음'}
                    </span>
                    <span className="inline-flex items-center justify-center gap-1.5 sm:justify-start">
                      <Calendar className="h-3.5 w-3.5 text-sage-500" />
                      합류 {formatDate.standard(m.joinDate)} · {formatDate.relative(m.joinDate)}
                    </span>
                  </div>

                  <p className="caveat pt-2 text-base text-ink-300">&ldquo;{m.highlight}&rdquo;</p>
                </div>
              </motion.article>
              )
            })}
          </div>
        </section>

        {/* ── Crew note ── */}
        <section className="mt-12 border-t border-dashed border-ink-500/15 pt-10">
          <PaperCard className="!p-8 sm:!p-10">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
              <div className="max-w-2xl space-y-2">
                <CaveatText className="text-lg text-coral-500">crew note</CaveatText>
                <h3 className="display-han text-2xl text-ink-500 sm:text-3xl">
                  서로의 속도를 존중하며.
                </h3>
                <p className="text-sm leading-relaxed text-ink-300">
                  각자의 도시, 각자의 페이스. 그래도 우리는 같은 지도를 보고 있어요.
                  업데이트가 쌓일 때마다 이 페이지도 같이 자라납니다.
                </p>
              </div>
              <button onClick={() => router.push('/cards')} className="ink-button">
                카드 컬렉션 보기
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </PaperCard>
        </section>
      </main>
    </div>
  )
}
