'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { 
  Star, 
  Calendar, 
  MapPin, 
  Clock, 
  Music, 
  Heart, 
  Gamepad2,
  Camera,
  Coffee,
  Book,
  Sparkles
} from 'lucide-react'

export default function HeeyeolPage() {
  const router = useRouter()
  const [daysUntilJoin, setDaysUntilJoin] = useState(0)

  useEffect(() => {
    // 합류 예정일까지의 일수 계산
    const joinDate = new Date('2025-09-01')
    const now = new Date()
    const diffTime = joinDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    setDaysUntilJoin(diffDays > 0 ? diffDays : 0)
  }, [])

  const interests = [
    { icon: Book, name: '독서', color: 'bg-indigo-500' },
    { icon: Music, name: '음악', color: 'bg-purple-500' },
    { icon: Camera, name: '영화', color: 'bg-blue-500' },
    { icon: Coffee, name: '카페', color: 'bg-amber-500' },
    { icon: Sparkles, name: '디자인', color: 'bg-pink-500' }
  ]

  const futureGoals = [
    { title: '랑구팸 합류 예정', date: '2025.09.01', emoji: '🔮', status: 'upcoming' },
    { title: '멤버들과의 첫 만남', date: '2025.09.05', emoji: '👋', status: 'planned' },
    { title: '첫 번째 프로젝트 참여', date: '2025.09.15', emoji: '🚀', status: 'planned' }
  ]

  const isJoined = daysUntilJoin <= 0

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-br from-indigo-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        
        {/* 헤더 섹션 */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-6xl shadow-xl">
            🔮
          </div>
          <h1 className="text-5xl font-bold text-gradient mb-4">윤희열</h1>
          <p className="text-xl text-gray-600 mb-6">
            {isJoined ? '임시 멤버' : '임시 멤버 (합류 예정)'}
          </p>
          
          {/* 합류 상태 */}
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              <span>2025.09.01 합류 예정</span>
            </div>
            {!isJoined && (
              <div className="flex items-center">
                <Clock className="w-4 h-4 mr-1" />
                <span>D-{daysUntilJoin}일</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* 소개 카드 */}
        <motion.div 
          className="glass-card p-8 mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h2 className="text-3xl font-bold text-primary-700 mb-6 text-center">자기소개</h2>
          <div className="text-lg text-gray-700 space-y-4 text-center max-w-3xl mx-auto">
            <p>
              안녕하세요! 곧 랑구팸에 합류할 <strong className="text-indigo-600">윤희열</strong>입니다.
            </p>
            <p>
              {isJoined ? (
                <>랑구팸의 일원이 되어 정말 기쁩니다! 새로운 환경에서 함께 만들어갈 
                이야기들이 벌써부터 기대돼요.</>
              ) : (
                <>2025년 9월부터 랑구팸의 임시 멤버로 합류할 예정이에요.
                비록 아직 만나지는 못했지만, 멤버분들과 함께할 시간이 벌써부터 기대됩니다!</>
              )}
            </p>
            <p>
              새로운 관점과 아이디어로 랑구팸에 보탬이 되고 싶어요.
              함께 즐거운 추억을 만들어나가요! 🌟
            </p>
          </div>
        </motion.div>

        {/* 관심사 */}
        <motion.div 
          className="glass-card p-8 mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <h2 className="text-3xl font-bold text-primary-700 mb-8 text-center">관심사</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            {interests.map((interest, index) => (
              <motion.div
                key={interest.name}
                className="text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className={`w-16 h-16 mx-auto mb-3 ${interest.color} rounded-full flex items-center justify-center shadow-lg`}>
                  <interest.icon className="w-8 h-8 text-white" />
                </div>
                <p className="text-sm font-medium text-gray-700">{interest.name}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* 계획 및 목표 */}
        <motion.div 
          className="glass-card p-8 mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-primary-700 mb-8 text-center">
            {isJoined ? '활동 계획' : '합류 계획'}
          </h2>
          <div className="space-y-6">
            {futureGoals.map((goal, index) => (
              <motion.div
                key={goal.title}
                className={`flex items-center p-4 rounded-lg ${
                  goal.status === 'upcoming' 
                    ? 'bg-gradient-to-r from-indigo-100 to-purple-100' 
                    : 'bg-gradient-to-r from-gray-100 to-gray-200'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}
              >
                <div className="text-3xl mr-4">{goal.emoji}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800">{goal.title}</h3>
                  <p className="text-sm text-gray-600">{goal.date}</p>
                </div>
                {goal.status === 'upcoming' && (
                  <div className="px-3 py-1 bg-indigo-500 text-white text-xs rounded-full">
                    예정
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* 랑구팸에서의 목표 */}
        <motion.div 
          className="glass-card p-8 mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <h2 className="text-3xl font-bold text-primary-700 mb-6 text-center">랑구팸에서의 목표</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center p-6 bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-xl">
              <div className="text-4xl mb-4">✨</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">창의적 기여</h3>
              <p className="text-sm text-gray-600">
                새로운 시각과 아이디어로<br />
                랑구팸에 기여하기
              </p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl">
              <div className="text-4xl mb-4">🌈</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">좋은 관계</h3>
              <p className="text-sm text-gray-600">
                멤버들과 깊이 있는<br />
                우정을 쌓아가기
              </p>
            </div>
          </div>
        </motion.div>

        {/* 카운트다운 또는 연락처 */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
        >
          <div className="glass-card p-8">
            {!isJoined ? (
              <>
                <h2 className="text-3xl font-bold text-primary-700 mb-6">합류까지</h2>
                <div className="text-6xl font-bold text-indigo-600 mb-4">
                  D-{daysUntilJoin}
                </div>
                <p className="text-lg text-gray-600 mb-6">
                  2025년 9월 1일, 새로운 시작을 기대해주세요!
                </p>
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold text-primary-700 mb-6">연락처</h2>
                <div className="flex items-center justify-center space-x-6 mb-6">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <span className="text-2xl">📧</span>
                    <span>heeyeol@rangu.fam</span>
                  </div>
                </div>
              </>
            )}
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-lg text-gray-600">
                랑구팸의 <strong className="text-indigo-600">새로운 가능성</strong>을 함께 만들어요! 🔮
              </p>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  )
}