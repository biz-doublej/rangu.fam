'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { User, MapPin, Calendar, ArrowRight, ArrowLeft } from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
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

export default function MembersPage() {
  const router = useRouter()
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
            <h1 className="text-xl font-bold text-gradient">멤버 소개</h1>
            <div className="w-10"></div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="pt-20 pb-12">
        <div className="max-w-6xl mx-auto p-6">
          {/* 인트로 섹션 */}
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-4">
              Rangu.fam 멤버들
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              네 친구의 각기 다른 이야기와 현재 모습을 만나보세요.
              각자의 길을 걸으며 서로를 응원하는 특별한 우정입니다.
            </p>
          </motion.div>

          {/* 로딩 상태 */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-lg text-gray-600">멤버 정보를 불러오고 있습니다...</p>
            </div>
          ) : (
            <>
              {/* 멤버 그리드 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {members.map((member: Member, index: number) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                  >
                    <Card hover className="h-full">
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          {/* 아바타 */}
                          <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                            {member.name[0]}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {/* 기본 정보 */}
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="text-xl font-bold text-gray-800 mb-1">
                                  {member.name}
                                </h3>
                                <p className="text-primary-600 font-medium">{member.role}</p>
                              </div>
                              <motion.button
                                className="glass-button p-2"
                                onClick={() => router.push(member.personalPageUrl || `/members/${member.id}`)}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <ArrowRight className="w-4 h-4 text-primary-600" />
                              </motion.button>
                            </div>
                            
                            {/* 설명 */}
                            <p className="text-gray-600 mb-4 line-clamp-2">
                              {member.description}
                            </p>
                            
                            {/* 메타 정보 */}
                            <div className="space-y-2 text-sm text-gray-500">
                              <div className="flex items-center">
                                <MapPin className="w-4 h-4 mr-2" />
                                <span>{member.location || '위치 정보 없음'}</span>
                              </div>
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-2" />
                                <span>가입: {formatDate.standard(member.joinDate)}</span>
                              </div>
                              <div className="flex items-center">
                                <User className="w-4 h-4 mr-2" />
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  member.status === 'active' 
                                    ? 'bg-green-100 text-green-700' 
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  {member.status === 'active' ? '활성' : '비활성'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* 프로필 보기 버튼 */}
                        <div className="mt-6 pt-4 border-t border-gray-100">
                          <Button
                            variant="glass"
                            className="w-full"
                            onClick={() => router.push(member.personalPageUrl || `/members/${member.id}`)}
                          >
                            프로필 보기
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {/* 하단 소개 카드 */}
              <motion.div
                className="mt-16"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <Card variant="glass">
                  <CardContent className="py-8">
                    <h3 className="text-xl font-semibold text-primary-700 mb-2">
                      🤝 네 친구의 이야기
                    </h3>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                      각자 다른 길을 걸어가고 있지만, 언제나 서로를 응원하며 
                      소중한 추억을 함께 나누는 네 친구의 공간입니다.
                      이곳에서 서로의 근황을 확인하고 응원의 메시지를 전해보세요.
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}
        </div>
      </main>
    </div>
  )
} 