'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, Trophy, Users, Star,
  Gamepad2, Zap, Brain, Spade, BarChart3
} from 'lucide-react'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

const games = [
  {
    id: 'tetris',
    title: '테트리스',
    description: '클래식 블록 퍼즐 게임으로 최고 점수에 도전하세요!',
    icon: Zap,
    color: 'from-blue-500 to-purple-500',
    difficulty: '중급',
    players: '1명',
    route: '/games/tetris'
  },
  {
    id: 'wordchain',
    title: '끝말잇기',
    description: '친구들과 함께 하는 재미있는 단어 연결 게임입니다.',
    icon: Brain,
    color: 'from-green-500 to-teal-500',
    difficulty: '쉬움',
    players: '2-4명',
    route: '/games/wordchain'
  },
  {
    id: 'cardgame',
    title: '카드 게임',
    description: '전략적인 카드 배틀로 친구들과 경쟁해보세요.',
    icon: Spade,
    color: 'from-red-500 to-pink-500',
    difficulty: '고급',
    players: '2-4명',
    route: '/games/cardgame'
  }
]

export default function GamesPage() {
  const router = useRouter()

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
            <h1 className="text-xl font-bold text-gradient">게임 센터</h1>
            <motion.button
              className="glass-button p-2"
              onClick={() => router.push('/games/leaderboard')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Trophy className="w-5 h-5 text-primary-600" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="pt-20 pb-12">
        <div className="max-w-6xl mx-auto p-6">
          {/* 헤로 섹션 */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-4">
              🎮 Rangu.fam 게임 센터
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              친구들과 함께 즐기는 다양한 게임들! 점수를 경쟁하고 순위를 확인해보세요.
            </p>
          </motion.div>

          {/* 게임 목록 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-2xl font-bold text-primary-700 mb-8 text-center">게임 목록</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* 순위표 바로가기 카드 */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card 
                  hover 
                  className="cursor-pointer overflow-hidden border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-orange-50"
                  onClick={() => router.push('/games/leaderboard')}
                >
                  <CardHeader>
                    <div className="w-full h-32 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center mb-4">
                      <Trophy className="w-12 h-12 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-orange-700">🏆 게임 순위표</h3>
                    <p className="text-sm text-gray-600">전체 게임의 순위와 통계를 확인해보세요!</p>
                  </CardHeader>

                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <BarChart3 className="w-4 h-4" />
                        <span>통계 & 순위</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span>모든 플레이어</span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter>
                    <Button variant="primary" className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600">
                      <Trophy className="w-4 h-4 mr-2" />
                      순위표 보기
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>

              {/* 게임 카드들 */}
              {games.map((game, index) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                >
                  <Card 
                    hover 
                    className="cursor-pointer overflow-hidden"
                    onClick={() => router.push(game.route)}
                  >
                    <CardHeader>
                      <div className={`w-full h-32 bg-gradient-to-r ${game.color} rounded-lg flex items-center justify-center mb-4`}>
                        <game.icon className="w-12 h-12 text-white" />
                      </div>
                      <h3 className="text-xl font-bold text-primary-700">{game.title}</h3>
                      <p className="text-sm text-gray-600">{game.description}</p>
                    </CardHeader>

                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          <Star className="w-4 h-4" />
                          <span>{game.difficulty}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span>{game.players}</span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="space-y-2">
                      <Button 
                        variant="primary" 
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(game.route)
                        }}
                      >
                        <Gamepad2 className="w-4 h-4 mr-2" />
                        게임 시작
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="w-full"
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/games/leaderboard?gameType=${game.id}`)
                        }}
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        순위표 보기
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  )
} 