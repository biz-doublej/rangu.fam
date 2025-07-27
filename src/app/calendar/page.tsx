'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Plus, Edit3, Trash2, Clock, 
  MapPin, Users, Image, Eye, Calendar as CalendarIcon,
  Filter, Search, Download, Share2
} from 'lucide-react'
import { Calendar } from '@/components/ui/Calendar'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { CalendarEvent, GalleryImage } from '@/types'
import { formatDate } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

// 더미 이벤트 데이터
const DEMO_EVENTS: CalendarEvent[] = [
  {
    id: '1',
    title: '정재원 생일파티 🎂',
    description: '재원이의 생일을 축하하는 모임입니다. 케이크와 선물 준비해주세요!',
    startDate: new Date('2024-02-15T18:00:00'),
    endDate: new Date('2024-02-15T22:00:00'),
    allDay: false,
    createdBy: 'jaewon',
    attendees: ['jaewon', 'minseok', 'jinkyu', 'hanul'],
    location: '강남구 카페',
    color: 'bg-pink-500',
    isPrivate: false
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
    isPrivate: false
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
    isPrivate: false
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
    isPrivate: false
  },
  {
    id: '5',
    title: 'Rangu.fam 정기모임',
    description: '월례 정기모임으로 근황 공유와 계획 논의를 합니다.',
    startDate: new Date('2024-03-10'),
    endDate: new Date('2024-03-10'),
    allDay: true,
    createdBy: 'jaewon',
    attendees: ['jaewon', 'minseok', 'jinkyu', 'hanul'],
    location: '서울역 근처',
    color: 'bg-orange-500',
    isPrivate: false
  }
]

// 더미 갤러리 이미지
const DEMO_GALLERY: GalleryImage[] = [
  {
    id: '1',
    url: '/images/event1.jpg',
    title: '생일파티 단체사진',
    description: '재원이 생일파티에서 찍은 기념사진',
    uploadedBy: 'jaewon',
    uploadDate: new Date('2024-01-15'),
    tags: ['생일', '파티', '친구'],
    eventId: '1'
  },
  {
    id: '2',
    url: '/images/event2.jpg',
    title: '스위스 풍경',
    description: '민석이가 보내준 스위스 알프스 사진',
    uploadedBy: 'minseok',
    uploadDate: new Date('2024-01-12'),
    tags: ['스위스', '알프스', '자연'],
  }
]

export default function CalendarPage() {
  const router = useRouter()
  const { canEdit, user } = useAuth()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'gallery'>('calendar')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredEvents = DEMO_EVENTS.filter(event =>
    event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.location?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedDateEvents = selectedDate 
    ? DEMO_EVENTS.filter(event => {
        const eventDate = new Date(event.startDate)
        return eventDate.toDateString() === selectedDate.toDateString()
      })
    : []

  const upcomingEvents = DEMO_EVENTS
    .filter(event => new Date(event.startDate) >= new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5)

  return (
    <div className="min-h-screen">
      {/* 헤더 */}
      <header className="glass-nav fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <motion.button
              className="glass-button p-2"
              onClick={() => router.push('/')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-5 h-5 text-primary-600" />
            </motion.button>
            <h1 className="text-xl font-bold text-gradient">달력</h1>
            <div className="flex items-center space-x-2">
              {canEdit && (
                <Button variant="glass" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  일정 추가
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto p-6">
          {/* 헤로 섹션 */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-4">
              📅 우리들의 달력
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              네 친구의 중요한 순간들과 특별한 추억을 함께 기록하고 공유하는 공간입니다.
            </p>
          </motion.div>

          {/* 검색 및 필터 */}
          <motion.div
            className="flex flex-col md:flex-row gap-4 mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="일정 검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'calendar' ? 'primary' : 'glass'}
                size="sm"
                onClick={() => setViewMode('calendar')}
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                달력
              </Button>
              <Button
                variant={viewMode === 'list' ? 'primary' : 'glass'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                목록
              </Button>
              <Button
                variant={viewMode === 'gallery' ? 'primary' : 'glass'}
                size="sm"
                onClick={() => setViewMode('gallery')}
              >
                <Image className="w-4 h-4 mr-2" />
                갤러리
              </Button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 메인 콘텐츠 */}
            <div className="lg:col-span-2">
              {viewMode === 'calendar' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Calendar
                    events={filteredEvents}
                    onDateClick={setSelectedDate}
                    onEventClick={setSelectedEvent}
                    selectedDate={selectedDate || undefined}
                  />
                </motion.div>
              )}

              {viewMode === 'list' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <h3 className="text-xl font-semibold text-primary-700">일정 목록</h3>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {filteredEvents.map((event, index) => (
                          <motion.div
                            key={event.id}
                            className="p-4 glass-button rounded-lg cursor-pointer hover:bg-primary-50"
                            onClick={() => setSelectedEvent(event)}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-semibold text-gray-800 mb-1">{event.title}</h4>
                                <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                                <div className="flex items-center space-x-4 text-xs text-gray-500">
                                  <div className="flex items-center space-x-1">
                                    <Clock className="w-3 h-3" />
                                    <span>
                                      {event.allDay 
                                        ? formatDate.standard(event.startDate)
                                        : formatDate.withTime(event.startDate)
                                      }
                                    </span>
                                  </div>
                                  {event.location && (
                                    <div className="flex items-center space-x-1">
                                      <MapPin className="w-3 h-3" />
                                      <span>{event.location}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center space-x-1">
                                    <Users className="w-3 h-3" />
                                    <span>{event.attendees.length}명</span>
                                  </div>
                                </div>
                              </div>
                              <div className={`w-4 h-4 rounded-full ${event.color}`}></div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {viewMode === 'gallery' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <h3 className="text-xl font-semibold text-primary-700">이벤트 갤러리</h3>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {DEMO_GALLERY.map((image, index) => (
                          <motion.div
                            key={image.id}
                            className="relative group cursor-pointer"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ scale: 1.05 }}
                          >
                            <div className="aspect-square bg-gradient-to-br from-primary-200 to-warm-200 rounded-lg flex items-center justify-center">
                              <Image className="w-8 h-8 text-primary-600" />
                            </div>
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 rounded-lg transition-all duration-200 flex items-center justify-center">
                              <div className="opacity-0 group-hover:opacity-100 flex space-x-2">
                                <Button variant="glass" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="glass" size="sm">
                                  <Download className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="mt-2">
                              <p className="text-sm font-medium text-gray-700 truncate">{image.title}</p>
                              <p className="text-xs text-gray-500">{image.uploadedBy}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      
                      {canEdit && (
                        <div className="mt-6 pt-6 border-t border-glass">
                          <Button variant="primary" className="w-full">
                            <Plus className="w-4 h-4 mr-2" />
                            새 사진 업로드
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* 사이드바 */}
            <div className="space-y-6">
              {/* 다가오는 일정 */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-primary-700">다가오는 일정</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {upcomingEvents.map((event, index) => (
                        <motion.div
                          key={event.id}
                          className="p-3 glass-button rounded-lg cursor-pointer"
                          onClick={() => setSelectedEvent(event)}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                        >
                          <div className="flex items-start space-x-3">
                            <div className={`w-3 h-3 rounded-full mt-1 ${event.color}`}></div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-gray-800 truncate">{event.title}</p>
                              <p className="text-xs text-gray-500">
                                {formatDate.monthDay(event.startDate)} • {event.attendees.length}명
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* 선택된 날짜의 일정 */}
              {selectedDate && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-semibold text-primary-700">
                        {formatDate.standard(selectedDate)}
                      </h3>
                    </CardHeader>
                    <CardContent>
                      {selectedDateEvents.length > 0 ? (
                        <div className="space-y-3">
                          {selectedDateEvents.map((event) => (
                            <div
                              key={event.id}
                              className="p-3 glass-button rounded-lg cursor-pointer"
                              onClick={() => setSelectedEvent(event)}
                            >
                              <div className="flex items-start space-x-3">
                                <div className={`w-3 h-3 rounded-full mt-1 ${event.color}`}></div>
                                <div>
                                  <p className="font-medium text-sm text-gray-800">{event.title}</p>
                                  <p className="text-xs text-gray-500">
                                    {event.allDay ? '하루 종일' : formatDate.timeOnly(event.startDate)}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-sm text-gray-500">이 날에는 일정이 없습니다.</p>
                          {canEdit && (
                            <Button variant="ghost" size="sm" className="mt-2">
                              <Plus className="w-4 h-4 mr-2" />
                              일정 추가
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* 이벤트 상세 모달 */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedEvent(null)}
          >
            <motion.div
              className="glass-card max-w-md w-full max-h-[80vh] overflow-y-auto"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-primary-700">{selectedEvent.title}</h3>
                    <div className={`w-4 h-4 rounded-full ${selectedEvent.color} mt-2`}></div>
                  </div>
                  <div className="flex space-x-2">
                    {canEdit && user?.username === selectedEvent.createdBy && (
                      <>
                        <Button variant="ghost" size="sm">
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)}>
                      ✕
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-gray-600">{selectedEvent.description}</p>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span>
                      {selectedEvent.allDay 
                        ? `${formatDate.standard(selectedEvent.startDate)} (하루 종일)`
                        : `${formatDate.withTime(selectedEvent.startDate)} - ${formatDate.withTime(selectedEvent.endDate)}`
                      }
                    </span>
                  </div>
                  
                  {selectedEvent.location && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span>{selectedEvent.location}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span>참여자: {selectedEvent.attendees.join(', ')}</span>
                  </div>
                </div>
              </CardContent>

              <CardFooter>
                <div className="flex space-x-2 w-full">
                  <Button variant="ghost" size="sm" className="flex-1">
                    <Share2 className="w-4 h-4 mr-2" />
                    공유
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