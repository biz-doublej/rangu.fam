'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { 
  Star, 
  Calendar, 
  Users, 
  Code, 
  Music, 
  Gamepad2, 
  BookOpen,
  Coffee,
  Plane,
  Shield,
  Clock
} from 'lucide-react'

export default function AboutPage() {
  const router = useRouter()
  const [timeStats, setTimeStats] = useState({
    formationDays: 0,
    formationYears: 0,
    completeDays: 0,
    completeYears: 0
  })

  const [scrollGuide, setScrollGuide] = useState({
    showTop: false,
    showBottom: true
  })

  const [upcomingEvents, setUpcomingEvents] = useState<Array<{
    name: string
    type: 'formation' | 'complete'
    targetDays: number
    targetDate: Date
    daysLeft: number
    emoji: string
    color: string
  }>>([])

  const [siteHistory, setSiteHistory] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [historyEvents, setHistoryEvents] = useState<any[]>([])

  // 사이트 히스토리 데이터 로드
  useEffect(() => {
    loadSiteHistory()
  }, [])

  const loadSiteHistory = async () => {
    try {
      const response = await fetch('/api/site-history')
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setSiteHistory(data.data)
          
          // 타임라인 데이터 설정
          const sortedEvents = [...data.data.events].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          )
          setHistoryEvents(sortedEvents)
          
          // 시간 통계 계산
          calculateTimeStats(data.data)
        }
      }
    } catch (error) {
      console.error('사이트 히스토리 로딩 오류:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // 기념일 목록 생성
  const createUpcomingEvents = (formationDate: Date, completeDate: Date) => {
    const now = new Date()
    const events: Array<{
      name: string
      type: 'formation' | 'complete'
      targetDays: number
      targetDate: Date
      daysLeft: number
      emoji: string
      color: string
    }> = []

    // 랑구팸 결성 기준 기념일들
    const formationMilestones = [
      { days: 600, name: '600일 기념', emoji: '🎊' },
      { days: 700, name: '700일 기념', emoji: '🎈' },
      { days: 730, name: '2주년', emoji: '🎂' },
      { days: 800, name: '800일 기념', emoji: '🌟' },
      { days: 900, name: '900일 기념', emoji: '🎯' },
      { days: 1000, name: '1000일 기념', emoji: '🏆' },
      { days: 1095, name: '3주년', emoji: '🎉' },
      { days: 1200, name: '1200일 기념', emoji: '💎' },
      { days: 1460, name: '4주년', emoji: '🎊' },
      { days: 1500, name: '1500일 기념', emoji: '🌈' },
      { days: 1825, name: '5주년', emoji: '👑' },
      { days: 2000, name: '2000일 기념', emoji: '🚀' },
    ]

    // 완전체 기준 기념일들
    const completeMilestones = [
      { days: 600, name: '완전체 600일', emoji: '💫' },
      { days: 700, name: '완전체 700일', emoji: '⭐' },
      { days: 730, name: '완전체 2주년', emoji: '🎭' },
      { days: 800, name: '완전체 800일', emoji: '🔥' },
      { days: 900, name: '완전체 900일', emoji: '💪' },
      { days: 1000, name: '완전체 1000일', emoji: '🏅' },
      { days: 1095, name: '완전체 3주년', emoji: '🎪' },
      { days: 1200, name: '완전체 1200일', emoji: '💝' },
      { days: 1460, name: '완전체 4주년', emoji: '🎨' },
      { days: 1500, name: '완전체 1500일', emoji: '🌺' },
      { days: 1825, name: '완전체 5주년', emoji: '🎖️' },
      { days: 2000, name: '완전체 2000일', emoji: '🛸' },
    ]

    // 랑구팸 결성 기준 이벤트 계산
    formationMilestones.forEach(milestone => {
      const targetDate = new Date(formationDate.getTime() + milestone.days * 24 * 60 * 60 * 1000)
      if (targetDate > now) {
        const daysLeft = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        events.push({
          name: milestone.name,
          type: 'formation' as const,
          targetDays: milestone.days,
          targetDate,
          daysLeft,
          emoji: milestone.emoji,
          color: 'from-pink-400 to-pink-600'
        })
      }
    })

    // 완전체 구성 기준 이벤트 계산
    completeMilestones.forEach(milestone => {
      const targetDate = new Date(completeDate.getTime() + milestone.days * 24 * 60 * 60 * 1000)
      if (targetDate > now) {
        const daysLeft = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        events.push({
          name: milestone.name,
          type: 'complete' as const,
          targetDays: milestone.days,
          targetDate,
          daysLeft,
          emoji: milestone.emoji,
          color: 'from-blue-400 to-blue-600'
        })
      }
    })

    // 날짜 순으로 정렬하고 가장 가까운 4개만 선택
    events.sort((a, b) => a.daysLeft - b.daysLeft)
    return events.slice(0, 4)
  }

  // 시간 계산 함수
  const calculateTimeStats = (historyData: any) => {
    if (!historyData) return
    
    const now = new Date()
    const formationDate = new Date(historyData.formationDate)
    const completeDate = new Date(historyData.completeDate)
    
    // 랑구팸 결성부터 계산
    const formationDiff = now.getTime() - formationDate.getTime()
    const formationDays = Math.floor(formationDiff / (1000 * 60 * 60 * 24))
    const formationYears = Math.floor(formationDays / 365)
    
    // 완전체 구성부터 계산
    const completeDiff = now.getTime() - completeDate.getTime()
    const completeDays = Math.floor(completeDiff / (1000 * 60 * 60 * 24))
    const completeYears = Math.floor(completeDays / 365)
    
    setTimeStats({
      formationDays,
      formationYears,
      completeDays,
      completeYears
    })

    // 다가오는 기념일 업데이트
    setUpcomingEvents(createUpcomingEvents(formationDate, completeDate))
  }

  // 스크롤 가이드 업데이트 함수
  const handleTimelineScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement
    const { scrollTop, scrollHeight, clientHeight } = target
    
    setScrollGuide({
      showTop: scrollTop > 50,
      showBottom: scrollTop < scrollHeight - clientHeight - 50
    })
  }

  useEffect(() => {
    if (siteHistory) {
      calculateTimeStats(siteHistory)
      // 1분마다 업데이트
      const interval = setInterval(() => calculateTimeStats(siteHistory), 60000)
      return () => clearInterval(interval)
    }
  }, [siteHistory])

  // 아이콘 매핑 함수
  const getIconForEvent = (iconName: string, type: string) => {
    switch (iconName) {
      case '🎉': return Users
      case '👥': return Shield
      case '🎂': return Star
      case '⭐': return Star
      case '🌟': return Star
      case '💻': return Code
      case '🎵': return Music
      case '🎮': return Gamepad2
      case '📚': return BookOpen
      case '✈️': return Plane
      case '☕': return Coffee
      default: 
        switch (type) {
          case 'formation': return Users
          case 'member': return Shield
          case 'anniversary': return Star
          case 'feature': return Code
          case 'milestone': return Calendar
          default: return Star
        }
    }
  }

  // 색상 매핑 함수
  const getColorForEvent = (color: string, type: string) => {
    const colorMap: { [key: string]: string } = {
      'primary': 'bg-blue-500',
      'secondary': 'bg-green-500',
      'accent': 'bg-purple-500',
      'luxury': 'bg-amber-500',
      'rainbow': 'bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500'
    }
    
    return colorMap[color] || 'bg-gray-500'
  }

  const members = [
    {
      name: '정재원',
      emoji: '👨‍💻',
      role: '개발자',
      description: '코딩과 기술에 열정을 가진 랑구팸의 기술 리더',
      specialty: '풀스택 개발',
      color: 'from-blue-400 to-blue-600'
    },
    {
      name: '정민석',
      emoji: '🏔️',
      role: '모험가',
      description: '새로운 경험과 도전을 즐기는 자유로운 영혼',
      specialty: '여행 & 탐험',
      color: 'from-green-400 to-green-600'
    },
    {
      name: '정진규',
      emoji: '🪖',
      role: '수호자',
      description: '든든한 믿음직한 랑구팸의 보호자',
      specialty: '리더십 & 책임감',
      color: 'from-orange-400 to-orange-600'
    },
    {
      name: '강한울',
      emoji: '🎮',
      role: '게이머',
      description: '게임과 엔터테인먼트의 전문가',
      specialty: '게임 & 재미',
      color: 'from-purple-400 to-purple-600'
    }
  ]

  const features = [
    {
      icon: Music,
      title: '음악 스테이션',
      description: '함께 듣고 싶은 음악을 공유하는 공간',
      link: '/music'
    },
    {
      icon: BookOpen,
      title: '이랑위키',
      description: '우리만의 지식과 추억을 기록하는 백과사전',
      link: '/wiki'
    },
    {
      icon: Gamepad2,
      title: '게임센터',
      description: '테트리스, 끝말잇기 등 다양한 게임을 즐기는 곳',
      link: '/games'
    },
    {
      icon: Calendar,
      title: '달력',
      description: '중요한 일정과 기념일을 함께 관리',
      link: '/calendar'
    }
  ]

  // 로딩 상태
  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 bg-gradient-to-br from-primary-50 to-warm-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Rangu.fam 히스토리를 불러오고 있습니다...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-br from-primary-50 to-warm-50">
      <div className="max-w-6xl mx-auto px-4 py-12">
        
        {/* 헤더 섹션 */}
        <motion.div 
          className="text-center mb-16"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl md:text-6xl font-bold text-gradient mb-6">
            Rangu.fam 소개
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            네 명의 특별한 친구들이 만든 온라인 공간, <br />
            랑구팸에서 우정과 추억을 함께 만들어가고 있습니다.
          </p>
        </motion.div>

        {/* 랑구팸이란? */}
        <motion.section 
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="glass-card p-8 md:p-12">
            <div className="flex items-center justify-center mb-8">
              <Star className="w-12 h-12 text-pink-500 mr-4" />
              <h2 className="text-4xl font-bold text-primary-700">랑구팸이란?</h2>
            </div>
            <div className="text-lg text-gray-700 space-y-4 max-w-4xl mx-auto text-center leading-relaxed">
              <p>
                <strong className="text-primary-600">랑구팸(Rangu.fam)</strong>은 네 명의 소중한 친구들이 만든 
                특별한 온라인 커뮤니티입니다.
              </p>
              <p>
                서로 다른 길을 걸어가면서도 변하지 않는 우정을 바탕으로, 
                함께 추억을 만들고 즐거운 시간을 보내는 공간입니다.
              </p>
              <p>
                각자의 개성과 재능을 살려 음악, 게임, 지식 공유 등 
                다양한 활동을 통해 더욱 끈끈한 관계를 만들어가고 있습니다.
              </p>
            </div>
          </div>
                 </motion.section>

         {/* 함께한 시간 통계 */}
         <motion.section 
           className="mb-20"
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, delay: 0.3 }}
         >
           <div className="glass-card p-8 md:p-12">
             <div className="flex items-center justify-center mb-8">
               <Clock className="w-12 h-12 text-blue-500 mr-4" />
               <h2 className="text-4xl font-bold text-primary-700">함께한 시간</h2>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
               {/* 랑구팸 결성 */}
               <div className="text-center">
                 <div className="bg-gradient-to-br from-pink-100 to-pink-200 rounded-2xl p-6 mb-4">
                   <Star className="w-12 h-12 text-pink-500 mx-auto mb-3" />
                   <h3 className="text-xl font-bold text-primary-700 mb-2">랑구팸 결성</h3>
                   <p className="text-sm text-gray-600 mb-4">2023년 6월 6일 오전 11:45</p>
                   <div className="space-y-2">
                     <p className="text-3xl font-bold text-pink-600">
                       D+{timeStats.formationDays.toLocaleString()}일
                     </p>
                     <p className="text-lg text-pink-500">
                       {timeStats.formationYears > 0 && `${timeStats.formationYears}주년 `}
                       {timeStats.formationDays % 365}일
                     </p>
                   </div>
                 </div>
                 <p className="text-sm text-gray-600">
                   인스타 그룹방이 생성된 날부터
                 </p>
               </div>

               {/* 완전체 구성 */}
               <div className="text-center">
                 <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-6 mb-4">
                   <Users className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                   <h3 className="text-xl font-bold text-primary-700 mb-2">완전체 구성</h3>
                   <p className="text-sm text-gray-600 mb-4">2023년 6월 11일 오전 1:10</p>
                   <div className="space-y-2">
                     <p className="text-3xl font-bold text-blue-600">
                       D+{timeStats.completeDays.toLocaleString()}일
                     </p>
                     <p className="text-lg text-blue-500">
                       {timeStats.completeYears > 0 && `${timeStats.completeYears}주년 `}
                       {timeStats.completeDays % 365}일
                     </p>
                   </div>
                 </div>
                 <p className="text-sm text-gray-600">
                   정민석이 합류한 날부터
                 </p>
               </div>
             </div>

             {/* 특별한 기념일 표시 */}
             <div className="mt-8 text-center">
               {timeStats.formationYears >= 1 && (
                 <div className="inline-flex items-center bg-gradient-to-r from-yellow-100 to-orange-100 px-6 py-3 rounded-full">
                   <span className="text-2xl mr-2">🎉</span>
                   <span className="text-lg font-bold text-orange-600">
                     랑구팸 {timeStats.formationYears}주년 달성!
                   </span>
                 </div>
               )}
               {timeStats.completeYears >= 1 && (
                 <div className="inline-flex items-center bg-gradient-to-r from-purple-100 to-pink-100 px-6 py-3 rounded-full ml-4">
                   <span className="text-2xl mr-2">✨</span>
                   <span className="text-lg font-bold text-purple-600">
                     완전체 {timeStats.completeYears}주년!
                   </span>
                 </div>
               )}
             </div>

             <div className="mt-6 text-center text-gray-500 text-sm">
               매분 실시간으로 업데이트됩니다 ⏰
             </div>
           </div>
         </motion.section>

         {/* 다가오는 축하의 날 */}
         <motion.section 
           className="mb-20"
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, delay: 0.35 }}
         >
           <div className="glass-card p-8 md:p-12">
             <div className="flex items-center justify-center mb-8">
               <span className="text-4xl mr-4">🎈</span>
               <h2 className="text-4xl font-bold text-primary-700">다가오는 축하의 날</h2>
             </div>
             
             {upcomingEvents.length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                 {upcomingEvents.map((event, index) => (
                   <motion.div
                     key={`${event.type}-${event.targetDays}`}
                     className="text-center"
                     initial={{ opacity: 0, y: 20 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ duration: 0.6, delay: 0.4 + index * 0.1 }}
                   >
                     <div className={`bg-gradient-to-br ${event.color} rounded-2xl p-6 text-white shadow-lg transform hover:scale-105 transition-all duration-300`}>
                       <div className="text-4xl mb-3">{event.emoji}</div>
                       <h3 className="text-lg font-bold mb-2">{event.name}</h3>
                       <div className="text-2xl font-bold mb-2">
                         D-{event.daysLeft}
                       </div>
                       <p className="text-sm opacity-90">
                         {event.targetDate.toLocaleDateString('ko-KR', { 
                           year: 'numeric',
                           month: 'long', 
                           day: 'numeric' 
                         })}
                       </p>
                       <div className="mt-3 text-xs opacity-75">
                         {event.type === 'formation' ? '랑구팸 결성 기준' : '완전체 구성 기준'}
                       </div>
                     </div>
                   </motion.div>
                 ))}
               </div>
             ) : (
               <div className="text-center text-gray-500">
                 <div className="text-6xl mb-4">🎊</div>
                 <p className="text-lg">모든 기념일을 축하했습니다!</p>
                 <p className="text-sm mt-2">새로운 기념일이 추가될 때까지 기다려주세요.</p>
               </div>
             )}

             {/* 특별한 기념일 하이라이트 */}
             {upcomingEvents.length > 0 && (
               <div className="mt-8 text-center">
                 <div className="inline-flex items-center bg-gradient-to-r from-yellow-100 to-orange-100 px-6 py-3 rounded-full">
                   <span className="text-2xl mr-2">⏰</span>
                   <span className="text-lg font-bold text-orange-600">
                     가장 가까운 기념일까지 {upcomingEvents[0]?.daysLeft}일 남았어요!
                   </span>
                 </div>
               </div>
             )}

             <div className="mt-6 text-center text-gray-500 text-sm">
               🏆 1000일 기념, 🎂 주년 기념, 🌈 1500일 기념 등 특별한 날들을 놓치지 마세요!
             </div>
           </div>
         </motion.section>

                  {/* 연혁 타임라인 */}
         <motion.section 
           className="mb-20"
           initial={{ opacity: 0, y: 30 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, delay: 0.4 }}
         >
           <div className="glass-card p-8">
             <h2 className="text-4xl font-bold text-primary-700 text-center mb-8">
               랑구팸 연혁
             </h2>
             <p className="text-center text-gray-500 mb-6">
               스크롤해서 더 많은 연혁을 확인하세요 ↓
             </p>
             
             {/* 스크롤 가능한 타임라인 컨테이너 */}
             <div 
               className="relative h-96 overflow-y-auto pr-4" 
               style={{
                 scrollbarWidth: 'thin',
                 scrollbarColor: '#a78bfa #f3f4f6'
               }}
               onScroll={handleTimelineScroll}
             >
               <div className="relative min-h-full">
                 {/* 타임라인 라인 - 전체 콘텐츠 높이에 맞춤 */}
                 <div 
                   className="absolute left-1/2 transform -translate-x-1/2 w-1 bg-gradient-to-b from-primary-200 to-primary-400"
                   style={{ 
                     height: `${historyEvents.length * 12 * 16 + 64}px`, // 아이템 수 * 간격 + 여백
                     top: '0px'
                   }}
                 ></div>
                 
                 <div className="space-y-12 py-8">
                   {historyEvents.map((item: any, index: number) => {
                     const IconComponent = getIconForEvent(item.icon, item.type)
                     const colorClass = getColorForEvent(item.color, item.type)
                     const formattedDate = new Date(item.date).toLocaleDateString('ko-KR', {
                       year: 'numeric',
                       month: '2-digit',
                       day: '2-digit'
                     }).replace(/\. /g, '.').replace(/\.$/, '')
                     
                     return (
                       <motion.div
                         key={item._id || index}
                         className={`flex items-center ${
                           index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
                         }`}
                         initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                         animate={{ opacity: 1, x: 0 }}
                         transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                       >
                         <div className={`w-5/12 ${index % 2 === 0 ? 'text-right pr-8' : 'text-left pl-8'}`}>
                           <div className="glass-card p-4 bg-white/80 hover:bg-white/90 transition-all duration-300">
                             <div className="flex items-center mb-2">
                               <IconComponent className="w-5 h-5 text-primary-600 mr-2" />
                               <h3 className="text-lg font-bold text-primary-700">{item.title}</h3>
                             </div>
                             <p className="text-lg font-bold text-primary-500 mb-2">{formattedDate}</p>
                             <p className="text-sm text-gray-600">{item.description}</p>
                           </div>
                         </div>
                         
                         {/* 중앙 아이콘 */}
                         <div className="relative z-10">
                           <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center shadow-lg`}>
                             <IconComponent className="w-5 h-5 text-white" />
                           </div>
                         </div>
                         
                         <div className="w-5/12"></div>
                       </motion.div>
                     )
                   })}
                 </div>
               </div>
               
               {/* 동적 스크롤 가이드 */}
               {scrollGuide.showTop && (
                 <div className="absolute top-2 left-1/2 transform -translate-x-1/2 text-center">
                   <div className="bg-primary-100 text-primary-600 px-3 py-1 rounded-full text-xs animate-bounce">
                     ↑ 위로 스크롤해서 더 보기
                   </div>
                 </div>
               )}
               
               {scrollGuide.showBottom && (
                 <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 text-center">
                   <div className="bg-primary-100 text-primary-600 px-3 py-1 rounded-full text-xs animate-bounce">
                     ↓ 아래로 스크롤해서 더 보기
                   </div>
                 </div>
               )}
             </div>
           </div>
         </motion.section>

        {/* 멤버 소개 */}
        <motion.section 
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <h2 className="text-4xl font-bold text-primary-700 text-center mb-12">
            랑구팸 멤버들
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {members.map((member, index) => (
              <motion.div
                key={member.name}
                className="glass-card p-8 text-center hover:shadow-glass transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.0 + index * 0.1 }}
                whileHover={{ y: -5 }}
              >
                <div className={`w-20 h-20 mx-auto mb-4 bg-gradient-to-br ${member.color} rounded-full flex items-center justify-center text-3xl shadow-lg`}>
                  {member.emoji}
                </div>
                <h3 className="text-2xl font-bold text-primary-700 mb-2">{member.name}</h3>
                <p className="text-lg font-medium text-primary-500 mb-3">{member.role}</p>
                <p className="text-gray-600 mb-4">{member.description}</p>
                <div className="inline-block bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium">
                  {member.specialty}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* 주요 기능 소개 */}
        <motion.section 
          className="mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
        >
          <h2 className="text-4xl font-bold text-primary-700 text-center mb-12">
            Rangu.fam 주요 기능
          </h2>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {features.map((feature, index) => (
               <motion.div
                 key={feature.title}
                 className="glass-card p-6 text-center hover:shadow-glass transition-all duration-300 cursor-pointer"
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={{ duration: 0.6, delay: 1.4 + index * 0.1 }}
                 whileHover={{ y: -5 }}
                 onClick={() => router.push(feature.link)}
               >
                 <div className="w-16 h-16 mx-auto mb-4 bg-primary-100 rounded-full flex items-center justify-center">
                   <feature.icon className="w-8 h-8 text-primary-600" />
                 </div>
                 <h3 className="text-lg font-bold text-primary-700 mb-2">{feature.title}</h3>
                 <p className="text-sm text-gray-600">{feature.description}</p>
                 <div className="mt-3 flex items-center justify-center text-primary-500 text-sm">
                   <span>페이지로 이동 →</span>
                 </div>
               </motion.div>
             ))}
           </div>
        </motion.section>

        {/* 마무리 메시지 */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.6 }}
        >
          <div className="glass-card p-8">
            <h3 className="text-3xl font-bold text-primary-700 mb-4">
              함께 만들어가는 이야기
            </h3>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
              랑구팸은 단순한 웹사이트가 아닙니다. <br />
              네 명의 친구들이 함께 만들어가는 특별한 추억의 공간이며, <br />
              앞으로도 계속해서 새로운 이야기를 써나갈 예정입니다.
            </p>
            <div className="mt-6 flex justify-center">
              <div className="flex items-center space-x-2 text-yellow-500">
                <Star className="w-6 h-6" />
                <span className="text-xl font-bold">Made with Passion by Rangu.fam</span>
                <Star className="w-6 h-6" />
              </div>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  )
}
