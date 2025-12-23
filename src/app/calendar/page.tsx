'use client'

import React, { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft,
  Plus,
  Edit3,
  Trash2,
  Clock,
  MapPin,
  Users,
  Image,
  Eye,
  Calendar as CalendarIcon,
  Search,
  Download,
  Share2,
  X,
  Pin
} from 'lucide-react'
import { Calendar } from '@/components/ui/Calendar'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { CalendarEvent, GalleryImage } from '@/types'
import { formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

const DEMO_EVENTS: CalendarEvent[] = [
  {
    id: '1',
    title: '정재원 생일파티',
    description: '재원이의 생일을 축하하는 모임입니다. 케이크와 선물 준비해주세요!',
    startDate: new Date('2024-02-15T18:00:00'),
    endDate: new Date('2024-02-15T22:00:00'),
    allDay: false,
    createdBy: 'jaewon',
    attendees: ['jaewon', 'minseok', 'jingyu', 'hanul'],
    location: '강남구 카페',
    color: 'bg-pink-500',
    isPrivate: false,
  },
  {
    id: '2',
    title: '스위스 여행 계획 회의',
    description: '민석이와 함께하는 스위스 여행 계획을 세우는 시간입니다.',
    startDate: new Date('2024-02-20T14:00:00'),
    endDate: new Date('2024-02-20T16:00:00'),
    allDay: false,
    createdBy: 'minseok',
    attendees: ['jaewon', 'minseok', 'hanul'],
    location: '온라인 (Zoom)',
    color: 'bg-blue-500',
    isPrivate: false,
  },
  {
    id: '3',
    title: '진규 면회',
    description: '진규 면회 일정입니다. 간식과 편지 준비했어요.',
    startDate: new Date('2024-02-25T13:00:00'),
    endDate: new Date('2024-02-25T15:00:00'),
    allDay: false,
    createdBy: 'jaewon',
    attendees: ['jaewon', 'minseok', 'hanul'],
    location: '부대 면회실',
    color: 'bg-green-500',
    isPrivate: false,
  },
  {
    id: '4',
    title: '게임 토너먼트 대회',
    description: '한울이가 주최하는 친구들 간의 게임 토너먼트입니다.',
    startDate: new Date('2024-03-01T19:00:00'),
    endDate: new Date('2024-03-01T23:00:00'),
    allDay: false,
    createdBy: 'hanul',
    attendees: ['jaewon', 'minseok', 'hanul'],
    location: '한울이 집',
    color: 'bg-purple-500',
    isPrivate: false,
  },
  {
    id: '5',
    title: 'Rangu.fam 정기모임',
    description: '월례 정기모임으로 근황 공유와 계획 논의를 합니다.',
    startDate: new Date('2024-03-10'),
    endDate: new Date('2024-03-10'),
    allDay: true,
    createdBy: 'jaewon',
    attendees: ['jaewon', 'minseok', 'jingyu', 'hanul'],
    location: '서울역 근처',
    color: 'bg-orange-500',
    isPrivate: false,
  },
]

const DEMO_GALLERY: GalleryImage[] = [
  {
    id: '1',
    url: '/images/event1.jpg',
    title: '생일파티 단체사진',
    description: '재원이 생일파티에서 찍은 기념사진',
    uploadedBy: 'jaewon',
    uploadDate: new Date('2024-01-15'),
    tags: ['생일', '파티', '친구'],
    eventId: '1',
  },
  {
    id: '2',
    url: '/images/event2.jpg',
    title: '스위스 풍경',
    description: '민석이가 보내준 스위스 알프스 사진',
    uploadedBy: 'minseok',
    uploadDate: new Date('2024-01-12'),
    tags: ['스위스', '알프스', '자연'],
  },
]

export default function CalendarPage() {
  const router = useRouter()
  const { canEdit, user } = useAuth()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'gallery'>('calendar')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredEvents = DEMO_EVENTS.filter((event) =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedDateEvents = selectedDate
    ? DEMO_EVENTS.filter((event) => {
        const eventDate = new Date(event.startDate)
        return eventDate.toDateString() === selectedDate.toDateString()
      })
    : []

  const upcomingEvents = DEMO_EVENTS
    .filter((event) => new Date(event.startDate) >= new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5)

  const stats = useMemo(
    () => [
      { label: '등록 일정', value: `${filteredEvents.length}개`, hint: '이번 달 기록' },
      { label: '다가오는 일정', value: `${upcomingEvents.length}개`, hint: '최대 5개 표시' },
      {
        label: '선택된 날짜',
        value: selectedDate ? formatDate.short(selectedDate) : '미선택',
        hint: `${selectedDateEvents.length}개 이벤트`,
      },
    ],
    [filteredEvents.length, selectedDate, selectedDateEvents.length, upcomingEvents.length]
  )

  const viewTabs: Array<{ key: typeof viewMode; label: string; icon: React.ReactNode }> = [
    { key: 'calendar', label: '캘린더', icon: <CalendarIcon className="mr-2 h-4 w-4" /> },
    { key: 'list', label: '타임라인', icon: <Clock className="mr-2 h-4 w-4" /> },
    { key: 'gallery', label: '갤러리', icon: <Image className="mr-2 h-4 w-4" /> },
  ]

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      <div className="pointer-events-none absolute inset-0 opacity-50">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute right-[-10rem] top-24 h-80 w-80 rounded-full bg-sky-500/15 blur-[120px]" />
      </div>

      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-slate-950/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <motion.button
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-slate-100 transition hover:-translate-x-0.5 hover:border-emerald-300/40"
            onClick={() => router.push('/')}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            <ArrowLeft className="h-5 w-5" />
          </motion.button>
          <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-emerald-100">
            Rangu.fam Calendar
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button variant="glass" size="sm">
                <Plus className="mr-2 h-4 w-4" /> 새 일정
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-7xl px-4 pb-16 pt-24">
        <motion.section
          className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="grid gap-6 md:grid-cols-5 md:items-center">
            <div className="space-y-3 md:col-span-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-emerald-100">
                우리만의 일정 허브
              </div>
              <h1 className="text-3xl font-bold leading-tight text-white md:text-4xl">담백한 다크 캘린더</h1>
              <p className="text-sm text-slate-300 md:text-base">
                캘린더 · 타임라인 · 갤러리 뷰를 오가며 빠르게 확인하세요. 필요 시 검색과 날짜 선택으로 집중할 수 있습니다.
              </p>
              <div className="flex flex-wrap gap-2">
                {viewTabs.map((tab) => (
                  <Button
                    key={tab.key}
                    size="sm"
                    variant={viewMode === tab.key ? 'primary' : 'glass'}
                    className="text-xs"
                    onClick={() => setViewMode(tab.key)}
                  >
                    {tab.icon}
                    {tab.label}
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-3 md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="제목, 장소, 메모 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border-white/10 bg-white/10 pl-10 text-slate-100 placeholder:text-slate-400"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                {stats.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-center">
                    <p className="text-[11px] uppercase tracking-[0.15em] text-slate-400">{item.label}</p>
                    <p className="text-xl font-semibold text-white">{item.value}</p>
                    <p className="text-[11px] text-slate-400">{item.hint}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {viewMode === 'calendar' && (
              <motion.div
                className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <Calendar
                  events={filteredEvents}
                  onDateClick={setSelectedDate}
                  onEventClick={setSelectedEvent}
                  selectedDate={selectedDate || undefined}
                />
                <div className="flex flex-wrap items-center gap-4 border-t border-white/5 px-5 py-4 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-emerald-300" /> 오늘
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-blue-500" /> 일정 있음
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-orange-400" /> 종일 이벤트
                  </div>
                </div>
              </motion.div>
            )}

            {viewMode === 'list' && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                <Card className="border-white/10 bg-white/5">
                  <CardHeader>
                    <h3 className="text-xl font-semibold text-white">타임라인</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {filteredEvents.map((event, index) => (
                        <motion.div
                          key={event.id}
                          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4"
                          onClick={() => setSelectedEvent(event)}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                        >
                          <div className="absolute inset-0 bg-white/5 opacity-0 transition group-hover:opacity-100" />
                          <div className="relative flex items-start justify-between gap-3">
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center gap-2 text-xs text-emerald-200">
                                <Clock className="h-3 w-3" />
                                {event.allDay ? formatDate.standard(event.startDate) : formatDate.withTime(event.startDate)}
                              </div>
                              <h4 className="text-base font-semibold text-white">{event.title}</h4>
                              <p className="text-sm text-slate-300 line-clamp-2">{event.description}</p>
                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                                {event.location && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1">
                                    <MapPin className="h-3 w-3" />
                                    {event.location}
                                  </span>
                                )}
                                <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1">
                                  <Users className="h-3 w-3" />
                                  {event.attendees.length}명
                                </span>
                              </div>
                            </div>
                            <div className={`h-4 w-4 flex-shrink-0 rounded-full ${event.color}`} />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {viewMode === 'gallery' && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
                <Card className="border-white/10 bg-white/5">
                  <CardHeader>
                    <h3 className="text-xl font-semibold text-white">이벤트 갤러리</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
                      {DEMO_GALLERY.map((image, index) => (
                        <motion.div
                          key={image.id}
                          className="group relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-white/5 p-3"
                          initial={{ opacity: 0, scale: 0.92 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.03 }}
                        >
                          <div className="aspect-square rounded-xl bg-slate-800/60 flex items-center justify-center">
                            <Image className="h-8 w-8 text-emerald-200" />
                          </div>
                          <div className="mt-3 space-y-1">
                            <p className="text-sm font-semibold text-white truncate">{image.title}</p>
                            <p className="text-xs text-slate-400">{image.uploadedBy}</p>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition group-hover:bg-black/25 group-hover:opacity-100">
                            <Button variant="glass" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="glass" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                    {canEdit && (
                      <div className="mt-6 border-t border-white/10 pt-6">
                        <Button variant="primary" className="w-full">
                          <Plus className="mr-2 h-4 w-4" /> 새 사진 업로드
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45 }}
              className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">다가오는 일정</h3>
                <span className="text-xs text-slate-400">최대 5개</span>
              </div>
              <div className="space-y-3">
                {upcomingEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    className="cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:border-emerald-300/40 hover:bg-white/10"
                    onClick={() => setSelectedEvent(event)}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 h-3 w-3 flex-shrink-0 rounded-full ${event.color}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-white truncate">{event.title}</p>
                        <p className="text-xs text-slate-400">{formatDate.monthDay(event.startDate)} · {event.attendees.length}명</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.05 }}
              className="rounded-3xl border border-white/10 bg-white/5 p-4 shadow-xl backdrop-blur"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                  {selectedDate ? formatDate.standard(selectedDate) : '날짜를 선택하세요'}
                </h3>
                {selectedDate && canEdit && (
                  <Button variant="glass" size="sm">
                    <Plus className="mr-1 h-4 w-4" /> 추가
                  </Button>
                )}
              </div>

              {selectedDate ? (
                selectedDateEvents.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDateEvents.map((event) => (
                      <div
                        key={event.id}
                        className="cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-3 transition hover:border-emerald-300/40 hover:bg-white/10"
                        onClick={() => setSelectedEvent(event)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`mt-1 h-3 w-3 flex-shrink-0 rounded-full ${event.color}`} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white">{event.title}</p>
                            <p className="text-xs text-slate-400">{event.allDay ? '하루 종일' : formatDate.timeOnly(event.startDate)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-sm text-slate-400">이 날에는 일정이 없습니다.</div>
                )
              ) : (
                <div className="text-sm text-slate-400">왼쪽 달력에서 날짜를 선택해주세요.</div>
              )}
            </motion.div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedEvent(null)}
          >
            <motion.div
              className="glass-card w-full max-w-md max-h-[80vh] overflow-y-auto border border-white/10 bg-slate-900/90"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="flex items-center gap-2 text-xs text-emerald-200">
                      <Pin className="h-3 w-3" />
                      {formatDate.standard(selectedEvent.startDate)}
                    </p>
                    <h3 className="text-xl font-semibold text-white">{selectedEvent.title}</h3>
                    <div className={`h-4 w-4 rounded-full ${selectedEvent.color}`} />
                  </div>
                  <div className="flex space-x-2">
                    {canEdit && user?.username === selectedEvent.createdBy && (
                      <>
                        <Button variant="ghost" size="sm">
                          <Edit3 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-slate-200">{selectedEvent.description}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Clock className="h-4 w-4 text-emerald-200" />
                    <span>
                      {selectedEvent.allDay
                        ? `${formatDate.standard(selectedEvent.startDate)} (하루 종일)`
                        : `${formatDate.withTime(selectedEvent.startDate)} - ${formatDate.withTime(selectedEvent.endDate)}`}
                    </span>
                  </div>
                  {selectedEvent.location && (
                    <div className="flex items-center gap-2 text-slate-300">
                      <MapPin className="h-4 w-4 text-emerald-200" />
                      <span>{selectedEvent.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-slate-300">
                    <Users className="h-4 w-4 text-emerald-200" />
                    <span>참여자: {selectedEvent.attendees.join(', ')}</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter>
                <div className="flex w-full space-x-2">
                  <Button variant="ghost" size="sm" className="flex-1">
                    <Share2 className="mr-2 h-4 w-4" /> 공유
                  </Button>
                  <Button variant="primary" size="sm" className="flex-1">
                    참여하기
                  </Button>
                </div>
              </CardFooter>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
