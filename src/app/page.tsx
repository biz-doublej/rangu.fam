'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  LogIn,
  LogOut,
  Menu,
  X,
  Package,
  BookOpen,
  Users,
  Settings,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { BookmarkWidget } from '@/components/ui/BookmarkWidget'
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

type SpotlightSlide = {
  id?: string
  type: 'image'
  src: string
  title: string
  durationSeconds?: number
}

const DEFAULT_SPOTLIGHT_SLIDES: SpotlightSlide[] = [
  { type: 'image', src: '/images/slide1.jpg', title: '추억의 사진 1', durationSeconds: 5 },
  { type: 'image', src: '/images/slide2.jpg', title: '추억의 사진 2', durationSeconds: 5 },
  { type: 'image', src: '/images/slide3.jpg', title: '추억의 사진 3', durationSeconds: 5 },
  { type: 'image', src: '/images/slide4.jpg', title: '추억의 사진 4', durationSeconds: 5 },
  { type: 'image', src: '/images/slide5.jpg', title: '추억의 사진 5', durationSeconds: 5 },
  { type: 'image', src: '/images/slide6.jpg', title: '추억의 사진 6', durationSeconds: 5 },
  { type: 'image', src: '/images/slide7.jpg', title: '추억의 사진 7', durationSeconds: 5 },
]

const navigationItems = [
  { label: '홈', href: '/' },
  { label: '소개', href: '/about' },
  { label: '멤버', href: '/members' },
  { label: '이랑위키', href: '/wiki' },
  { label: '카드', href: '/cards' },
]

const quickPaths = [
  {
    title: '카드 드랍',
    desc: '하루 한 번 열리는 카드',
    href: '/cards',
    icon: Package,
    accent: 'mustard' as const,
    rotate: 'left' as const,
    tape: 'top-left' as const,
  },
  {
    title: '이랑위키',
    desc: '우리만의 기록을 정리하는 곳',
    href: '/wiki',
    icon: BookOpen,
    accent: 'sage' as const,
    rotate: 'right' as const,
    tape: 'top-right' as const,
  },
  {
    title: '멤버 카드',
    desc: '다섯 명의 한 줄 소개',
    href: '/members',
    icon: Users,
    accent: 'coral' as const,
    rotate: 'left' as const,
    tape: 'top' as const,
  },
]

const memberSnippets = [
  { id: 'jaewon', name: '정재원', role: '개발 · 패션', src: '/images/profile/jw.jpg', rot: 'left' as const, tape: 'top-left' as const, color: 'coral' as const },
  { id: 'minseok', name: '정민석', role: '루체른 IMI', src: '/images/profile/ms.png', rot: 'right' as const, tape: 'top-right' as const, color: 'sage' as const },
  { id: 'jingyu', name: '정진규', role: '복무 중', src: '/images/profile/jq.jpg', rot: 'left' as const, tape: 'top' as const, color: 'mustard' as const },
  { id: 'hanul', name: '강한울', role: '철도차량시스템 진학 예정', src: '/images/profile/hu.jpg', rot: 'extra' as const, tape: 'top-right' as const, color: 'coral' as const },
  { id: 'seungchan', name: '이승찬', role: '마술사', src: '/images/profile/sc.jpg', rot: 'right' as const, tape: 'top-left' as const, color: 'sage' as const },
]

export default function HomePage() {
  const router = useRouter()
  const { user, logout, isLoggedIn } = useAuth()

  const [currentSlide, setCurrentSlide] = useState(0)
  const [slideContent, setSlideContent] = useState<SpotlightSlide[]>(DEFAULT_SPOTLIGHT_SLIDES)
  const [isClient, setIsClient] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showDepartureModal, setShowDepartureModal] = useState(true)

  const [times, setTimes] = useState({
    seoul: new Date(),
    vancouver: new Date(),
    switzerland: new Date(),
  })
  const [countdown, setCountdown] = useState(DEFAULT_SPOTLIGHT_SLIDES[0]?.durationSeconds || 5)

  const departureImageSrc = '/images/minseok-farewell.jpg'
  const departureHideKey = 'rangu_departure_hide_until_v2'

  const slideCount = slideContent.length || 1
  const activeSlide = slideContent[currentSlide]

  /* ───────── effects ───────── */
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!isClient) return
    const hiddenUntilRaw = localStorage.getItem(departureHideKey)
    if (!hiddenUntilRaw) return
    const hiddenUntil = Number(hiddenUntilRaw)
    if (Number.isNaN(hiddenUntil)) {
      localStorage.removeItem(departureHideKey)
      return
    }
    if (hiddenUntil > Date.now()) setShowDepartureModal(false)
  }, [isClient])

  useEffect(() => {
    let isMounted = true
    const fetchSlides = async () => {
      try {
        const response = await fetch('/api/spotlight', { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json()
        if (isMounted && Array.isArray(data.slides) && data.slides.length) {
          const imageSlides = data.slides.filter(
            (slide: any) => slide?.type === 'image' && typeof slide?.src === 'string'
          )
          if (imageSlides.length > 0) {
            setSlideContent(imageSlides)
            setCurrentSlide(0)
          }
        }
      } catch (error) {
        console.error('Failed to load spotlight slides:', error)
      }
    }
    fetchSlides()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!isClient) return
    const updateTimes = () => {
      const now = new Date()
      setTimes({
        seoul: new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' })),
        vancouver: new Date(now.toLocaleString('en-US', { timeZone: 'America/Vancouver' })),
        switzerland: new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Zurich' })),
      })
    }
    updateTimes()
    const id = setInterval(updateTimes, 1000)
    return () => clearInterval(id)
  }, [isClient])

  useEffect(() => {
    const c = slideContent[currentSlide]
    if (!c) return
    setCountdown(c.durationSeconds || 5)
  }, [currentSlide, slideContent])

  useEffect(() => {
    if (!slideContent.length) return
    const id = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCurrentSlide((cur) => (cur + 1) % slideContent.length)
          return prev
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [slideContent.length])

  /* ───────── helpers ───────── */
  const todayLabel = isClient
    ? format(times.seoul, 'yyyy. MM. dd · EEE')
    : '— —'

  /* ───────── render ───────── */
  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* Departure modal — preserved */}
      {showDepartureModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-ink-500/80 backdrop-blur-sm px-4"
          onClick={() => setShowDepartureModal(false)}
        >
          <div
            className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-paper-300 bg-paper-50 p-6 sm:p-10"
            onClick={(e) => e.stopPropagation()}
          >
            <CaveatText className="text-xl text-coral-500">a moment to remember</CaveatText>
            <h2 className="display-han mt-1 text-3xl text-ink-500">민석이가 떠나기 전 그날.</h2>
            <div className="mt-5 overflow-hidden rounded-2xl border border-paper-300">
              <Image src={departureImageSrc} alt="민석 farewell" width={1280} height={720} priority className="h-auto w-full" />
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                className="ghost-button"
                onClick={() => {
                  localStorage.setItem(departureHideKey, String(Date.now() + 24 * 60 * 60 * 1000))
                  setShowDepartureModal(false)
                }}
              >
                하루 안 보기
              </button>
              <button type="button" className="ink-button" onClick={() => setShowDepartureModal(false)}>
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────── Magazine Masthead ─────────── */}
      <header className="border-b border-dashed border-ink-500/15 bg-paper-50/70 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-baseline gap-3">
            <span className="display-han text-2xl tracking-tight text-ink-500 sm:text-3xl">RANGU.FAM</span>
            <span className="hidden text-xs font-semibold uppercase tracking-[0.2em] text-ink-300 sm:inline">
              vol. 27 · {isClient ? format(new Date(), 'yyyy') : '2026'}
            </span>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {navigationItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="px-3 py-1.5 text-sm font-semibold text-ink-300 transition-colors hover:text-ink-500"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                <button
                  type="button"
                  onClick={() => router.push('/settings/account')}
                  className="hidden text-right sm:block"
                  title="계정 설정"
                >
                  <p className="text-sm font-semibold text-ink-500">{user?.username}</p>
                  <p className="text-[11px] uppercase tracking-wider text-ink-300">
                    {user?.role === 'member' ? 'MEMBER' : 'GUEST'}
                  </p>
                </button>
                <button
                  type="button"
                  className="rounded-full p-2 text-ink-300 hover:bg-ink-500/10 hover:text-ink-500"
                  onClick={() => logout()}
                  title="로그아웃"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => router.push('/auth/start?callbackUrl=%2F')}
                className="ink-button text-sm"
                title="로그인"
              >
                <LogIn className="h-4 w-4" />
                로그인
              </button>
            )}
            <button
              type="button"
              className="rounded-full p-2 text-ink-500 hover:bg-ink-500/10 md:hidden"
              onClick={() => setIsMenuOpen((v) => !v)}
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav drawer */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              className="md:hidden"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <nav className="border-t border-dashed border-ink-500/15 px-6 py-4">
                {navigationItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    className="block py-2 text-base font-semibold text-ink-500"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </a>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* ─────────── Hero ─────────── */}
      <main className="mx-auto max-w-6xl px-5 sm:px-8">
        <section className="relative grid gap-12 py-16 lg:grid-cols-[1.05fr,1fr] lg:items-center lg:gap-16 lg:py-24">
          {/* Left — typography */}
          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-3">
              <span className="scrap-eyebrow">{"today's page"} · {todayLabel}</span>
              <DoodleArrow direction="right" className="hidden text-coral-500 sm:block" />
            </div>

            <h1 className="scrap-h1">
              추억과 지금을<br />
              <InkUnderline variant="coral">한 장에서</InkUnderline>.
            </h1>

            <p className="max-w-md text-lg leading-relaxed text-ink-300">
              이곳은 다섯 친구의 종이 한 장.
              매일 새로 붙이는 사진, 매일 새로 적는 문장.
              그날 그날의 우리를 모아 둡니다.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button onClick={() => router.push('/cards')} className="ink-button">
                <Sparkles className="h-4 w-4" />
                오늘의 카드 열기
              </button>
              <button onClick={() => router.push('/wiki')} className="ghost-button">
                이랑위키 들어가기
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-2 pt-4">
              <Pin color="coral" />
              <p className="text-sm text-ink-300 sm:text-base">
                <span className="font-semibold text-ink-500">{slideContent.length}장</span>의 사진이 모였어요.
              </p>
            </div>
          </div>

          {/* Right — spotlight polaroid */}
          <div className="relative">
            <div className="absolute -left-6 -top-4 hidden lg:block">
              <CaveatText className="text-2xl text-coral-500">{"today's spotlight ↓"}</CaveatText>
            </div>

            <div className="relative mx-auto" style={{ maxWidth: 460 }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSlide?.id || `${currentSlide}-${activeSlide?.src || 'slide'}`}
                  initial={{ opacity: 0, y: 20, rotate: -4 }}
                  animate={{ opacity: 1, y: 0, rotate: -2 }}
                  exit={{ opacity: 0, y: -20, rotate: 0 }}
                  transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  {activeSlide ? (
                    <Polaroid
                      src={activeSlide.src}
                      alt={activeSlide.title}
                      caption={activeSlide.title}
                      width={460}
                      height={460}
                      priority={currentSlide === 0}
                      tape="corners"
                      aspect="square"
                    />
                  ) : (
                    <div className="polaroid">
                      <div className="polaroid-photo aspect-square flex items-center justify-center bg-paper-200 text-ink-300">
                        준비 중인 콘텐츠
                      </div>
                      <div className="polaroid-caption">…</div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* slide controls */}
              <div className="mt-8 flex items-center justify-between gap-4">
                <button
                  type="button"
                  className="rounded-full border border-ink-500/20 bg-paper-50 p-2 text-ink-500 transition hover:border-ink-500/40"
                  onClick={() => setCurrentSlide(currentSlide === 0 ? slideCount - 1 : currentSlide - 1)}
                  aria-label="이전 사진"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="flex flex-1 items-center justify-center gap-2">
                  {slideContent.map((s, i) => (
                    <button
                      key={s.id || `${s.src}-${i}`}
                      type="button"
                      onClick={() => setCurrentSlide(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === currentSlide ? 'w-8 bg-ink-500' : 'w-2 bg-ink-500/25 hover:bg-ink-500/45'
                      }`}
                      aria-label={`사진 ${i + 1}`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-3">
                  <span className="caveat text-base text-ink-300">{currentSlide + 1} / {slideCount}</span>
                  <button
                    type="button"
                    className="rounded-full border border-ink-500/20 bg-paper-50 p-2 text-ink-500 transition hover:border-ink-500/40"
                    onClick={() => setCurrentSlide((currentSlide + 1) % slideCount)}
                    aria-label="다음 사진"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mt-2 text-center text-xs uppercase tracking-[0.2em] text-ink-300">
                next in {countdown}s
              </div>
            </div>
          </div>
        </section>

        {/* ─────────── Quick paths ─────────── */}
        <section className="border-t border-dashed border-ink-500/15 py-16">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <CaveatText className="text-xl text-coral-500">{"today's quick paths"}</CaveatText>
              <h2 className="scrap-h2 mt-1">오늘 어디부터 갈까?</h2>
            </div>
            <CaveatText className="hidden text-lg text-ink-300 sm:block">↓ pick one</CaveatText>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 sm:gap-6">
            {quickPaths.map((q) => {
              const Icon = q.icon
              const accentHex =
                q.accent === 'coral' ? '#E0654E' : q.accent === 'sage' ? '#3E5C4A' : '#C28A2D'
              const accentBg =
                q.accent === 'coral'
                  ? 'rgba(224,101,78,0.12)'
                  : q.accent === 'sage'
                  ? 'rgba(62,92,74,0.12)'
                  : 'rgba(194,138,45,0.14)'
              return (
                <button
                  key={q.title}
                  onClick={() => router.push(q.href)}
                  className="group relative w-full text-left"
                >
                  {/* ── Mobile: 가로 카드 ── */}
                  <div className="flex items-center gap-4 rounded-2xl border border-ink-500/12 bg-paper-50 p-4 shadow-paper transition active:scale-[0.99] sm:hidden">
                    <span
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: accentBg }}
                    >
                      <Icon className="h-7 w-7" style={{ color: accentHex }} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-semibold text-ink-500">{q.title}</span>
                      <span className="mt-0.5 block text-xs text-ink-300">{q.desc}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-ink-300 transition group-hover:text-ink-500" />
                  </div>

                  {/* ── sm+: 폴라로이드 ── */}
                  <div className="hidden sm:block">
                    <div className="mx-auto" style={{ maxWidth: 280 }}>
                      <div
                        className={`polaroid polaroid--rot-${
                          q.rotate === 'left' ? 'l' : q.rotate === 'right' ? 'r' : 'xl'
                        } transition-transform group-hover:!translate-y-[-6px] group-hover:!rotate-0`}
                      >
                        <TapeStrip
                          className={
                            q.tape === 'top-left'
                              ? 'tape--top-left'
                              : q.tape === 'top-right'
                              ? 'tape--top-right'
                              : 'tape--top'
                          }
                          color={q.accent === 'coral' ? 'coral' : q.accent === 'sage' ? 'sage' : 'yellow'}
                        />
                        <div className="polaroid-photo aspect-square flex items-center justify-center bg-paper-100">
                          <Icon className="h-20 w-20" style={{ color: accentHex }} />
                        </div>
                        <div className="polaroid-caption">{q.title}</div>
                      </div>
                    </div>
                    <p className="mt-4 text-center text-sm text-ink-300">{q.desc}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </section>

        {/* ─────────── Members snapshot ─────────── */}
        <section className="border-t border-dashed border-ink-500/15 py-16">
          <div className="mb-10 flex items-end justify-between gap-4">
            <div>
              <CaveatText className="text-xl text-coral-500">cast of vol.27</CaveatText>
              <h2 className="scrap-h2 mt-1">
                <InkUnderline variant="mustard">다섯</InkUnderline>의 친구
              </h2>
            </div>
            <button onClick={() => router.push('/members')} className="ghost-button text-sm">
              전체 카드 보기
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-6 sm:gap-y-12 lg:grid-cols-5">
            {memberSnippets.map((m) => {
              const url = memberSiteUrl(m.id as MemberSlug)
              const Wrapper: any = url ? 'a' : 'div'
              const wrapperProps = url
                ? { href: url, className: 'group block text-center' }
                : { className: 'block text-center' }
              return (
                <Wrapper key={m.id} {...wrapperProps}>
                  <div className="mx-auto" style={{ maxWidth: 180 }}>
                    <div
                      className={`polaroid polaroid--rot-${m.rot === 'left' ? 'l' : m.rot === 'right' ? 'r' : 'xl'} transition-transform ${
                        url ? 'group-hover:!translate-y-[-4px] group-hover:!rotate-0' : ''
                      }`}
                    >
                      <TapeStrip
                        className={
                          m.tape === 'top-left'
                            ? 'tape--top-left'
                            : m.tape === 'top-right'
                            ? 'tape--top-right'
                            : 'tape--top'
                        }
                        color={m.color === 'coral' ? 'coral' : m.color === 'sage' ? 'sage' : 'yellow'}
                      />
                      <div className="polaroid-photo aspect-[3/4] bg-paper-200">
                        <Image src={m.src} alt={m.name} width={180} height={240} className="h-full w-full object-cover" />
                      </div>
                      <div className="polaroid-caption">{m.name}</div>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-ink-300">{m.role}</p>
                </Wrapper>
              )
            })}
          </div>
        </section>

        {/* ─────────── Bookmarks for member-only (DB userId = member slug) ─────────── */}
        {isLoggedIn && user?.memberId && (
          <section className="border-t border-dashed border-ink-500/15 py-16">
            <div className="mb-6 flex items-center gap-3">
              <CaveatText className="text-xl text-coral-500">my pinned notes</CaveatText>
              <DoodleArrow direction="right" className="text-ink-300" />
            </div>
            <PaperCard className="!p-6 sm:!p-8">
              <BookmarkWidget userId={user.memberId} />
            </PaperCard>
          </section>
        )}

        {/* ─────────── Colophon ─────────── */}
        <section className="border-t border-dashed border-ink-500/15 py-16">
          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <CaveatText className="text-xl text-coral-500">현재 시각</CaveatText>
              <p className="mt-3 text-sm text-ink-300">친구들이 머무는 세 도시.</p>
              <ul className="mt-4 space-y-2">
                {[
                  { city: '서울', value: isClient ? format(times.seoul, 'HH:mm:ss') : '--:--:--', zone: 'KST' },
                  { city: '밴쿠버', value: isClient ? format(times.vancouver, 'HH:mm:ss') : '--:--:--', zone: 'PST' },
                  { city: '스위스', value: isClient ? format(times.switzerland, 'HH:mm:ss') : '--:--:--', zone: 'CET' },
                ].map((t) => (
                  <li key={t.city} className="flex items-baseline justify-between border-b border-dotted border-ink-500/15 pb-1.5">
                    <span className="text-sm font-medium text-ink-500">{t.city}</span>
                    <span className="font-mono text-sm tabular-nums text-ink-300">{t.value} <span className="text-xs uppercase tracking-wider">{t.zone}</span></span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <CaveatText className="text-xl text-coral-500">colophon</CaveatText>
              <p className="mt-3 text-sm leading-relaxed text-ink-300">
                Rangu.fam은 2020년 다섯 친구가 시작한 작은 페이지에서 자라난,
                지금은 <Handwritten size="sm" className="text-coral-500">매일 새로 적히는</Handwritten> 우리만의 잡지입니다.
              </p>
              <p className="mt-3 text-xs text-ink-300/70">
                Vol. 27 · 2026 Spring Issue<br />
                Cover photo · {"today's spotlight"}
              </p>
            </div>

            <div>
              <CaveatText className="text-xl text-coral-500">staff & links</CaveatText>
              <ul className="mt-3 space-y-1.5 text-sm">
                {[
                  { label: '소개 페이지', href: '/about' },
                  { label: '카드 컬렉션', href: '/cards' },
                  { label: '멤버 카드', href: '/members' },
                  { label: '이랑위키', href: '/wiki' },
                  { label: '계정 설정', href: '/settings/account' },
                ].map((l) => (
                  <li key={l.href}>
                    <a href={l.href} className="group inline-flex items-center gap-1 text-ink-500 transition-colors hover:text-coral-500">
                      {l.label}
                      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
