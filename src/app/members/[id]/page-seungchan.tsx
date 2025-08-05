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
  Code
} from 'lucide-react'

export default function SeungchanPage() {
  const router = useRouter()
  const [joinDays, setJoinDays] = useState(0)

  useEffect(() => {
    // 합류일부터 현재까지의 일수 계산
    const joinDate = new Date('2025-07-21')
    const now = new Date()
    const diffTime = now.getTime() - joinDate.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    setJoinDays(diffDays)
  }, [])

  const interests = [
    { icon: Code, name: '프로그래밍', color: 'bg-blue-500' },
    { icon: Music, name: '음악', color: 'bg-purple-500' },
    { icon: Camera, name: '사진', color: 'bg-green-500' },
    { icon: Coffee, name: '카페', color: 'bg-amber-500' },
    { icon: Gamepad2, name: '게임', color: 'bg-red-500' }
  ]

  const achievements = [
    { title: '랑구팸 임시 멤버 합류', date: '2025.07.21', emoji: '🌟' },
    { title: '첫 번째 주간 활동 완료', date: '2025.07.28', emoji: '🏆' },
    { title: '멤버들과 첫 만남', date: '2025.08.01', emoji: '🤝' }
  ]

  return (
    <div className="min-h-screen pt-20 bg-gradient-to-br from-yellow-50 to-orange-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        
        {/* 헤더 섹션 */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-6xl shadow-xl">
            🌟
          </div>
          <h1 className="text-5xl font-bold text-gradient mb-4">이승찬</h1>
          <p className="text-xl text-gray-600 mb-6">임시 멤버 (정진규 대체)</p>
          
          {/* 가입 기간 */}
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-1" />
              <span>2025.07.21 합류</span>
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              <span>D+{joinDays}일</span>
            </div>
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
              안녕하세요! 랑구팸에 임시로 합류하게 된 <strong className="text-yellow-600">이승찬</strong>입니다.
            </p>
            <p>
              정진규가 군 입대를 하게 되면서 그 자리를 임시로 맡게 되었어요.
              비록 임시 멤버이지만, 랑구팸의 특별한 우정과 즐거운 분위기에 
              함께할 수 있어서 정말 기쁩니다.
            </p>
            <p>
              새로운 환경에서 새로운 친구들과 함께 만들어갈 추억들이 벌써부터 기대돼요!
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

        {/* 활동 기록 */}
        <motion.div 
          className="glass-card p-8 mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <h2 className="text-3xl font-bold text-primary-700 mb-8 text-center">활동 기록</h2>
          <div className="space-y-6">
            {achievements.map((achievement, index) => (
              <motion.div
                key={achievement.title}
                className="flex items-center p-4 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-lg"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.8 + index * 0.1 }}
              >
                <div className="text-3xl mr-4">{achievement.emoji}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-800">{achievement.title}</h3>
                  <p className="text-sm text-gray-600">{achievement.date}</p>
                </div>
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
            <div className="text-center p-6 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl">
              <div className="text-4xl mb-4">🤝</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">친목 도모</h3>
              <p className="text-sm text-gray-600">
                멤버들과 더 가까워지고<br />
                즐거운 추억 만들기
              </p>
            </div>
            <div className="text-center p-6 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl">
              <div className="text-4xl mb-4">💡</div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">새로운 아이디어</h3>
              <p className="text-sm text-gray-600">
                랑구팸에 신선한<br />
                아이디어와 에너지 전달
              </p>
            </div>
          </div>
        </motion.div>

        {/* 연락처 & 소셜 */}
        <motion.div 
          className="text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
        >
          <div className="glass-card p-8">
            <h2 className="text-3xl font-bold text-primary-700 mb-6">연락처</h2>
            <div className="flex items-center justify-center space-x-6">
              <div className="flex items-center space-x-2 text-gray-600">
                <span className="text-2xl">📧</span>
                <span>seungchan@rangu.fam</span>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-lg text-gray-600">
                랑구팸의 <strong className="text-yellow-600">새로운 바람</strong>이 되겠습니다! ⭐
              </p>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  )
}