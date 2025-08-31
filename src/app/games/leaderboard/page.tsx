'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Trophy, Medal, Award, Crown,
  Calendar, Users, TrendingUp, Clock, Filter,
  Gamepad2, Zap, Brain, Spade, BarChart3, Target, RefreshCw
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { formatDate } from '@/lib/utils'

interface LeaderboardEntry {
  rank: number
  playerId: string
  playerName: string
  score?: number
  scoreValue: number
  level?: number
  duration?: number
  createdAt?: string
  gameData?: any
  isPersonalBest?: boolean
  isNewRecord?: boolean
  totalGames?: number
  wins?: number
  winRate?: number
  bestStreak?: number
}

interface GameStatistics {
  totalPlayers: number
  totalGames: number
  averageScore: number
  highestScore: any
  totalPlayTime: number
  period: string
}

interface LeaderboardData {
  leaderboard?: LeaderboardEntry[]
  gameSpecific?: {
    tetris: LeaderboardEntry[]
    wordchain: LeaderboardEntry[]
    cardgame: LeaderboardEntry[]
  }
  overall?: LeaderboardEntry[]
  gameType: string
  period: string
  category: string
  statistics?: GameStatistics
}

const GAME_ICONS = {
  tetris: Gamepad2,
  wordchain: Brain,
  cardgame: Spade,
  all: Trophy
}

const GAME_NAMES = {
  tetris: '테트리스',
  wordchain: '끝말잇기',
  cardgame: '원카드',
  all: '전체 게임'
}

const RANK_COLORS = {
  1: 'text-yellow-500',
  2: 'text-gray-400',
  3: 'text-amber-600'
}

const RANK_ICONS = {
  1: Crown,
  2: Medal,
  3: Award
}

export default function LeaderboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedGame, setSelectedGame] = useState<string>('all')
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('score')
  const [showFilters, setShowFilters] = useState(false)

  // URL 파라미터 처리
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const gameType = urlParams.get('gameType')
      if (gameType && ['tetris', 'wordchain', 'cardgame'].includes(gameType)) {
        setSelectedGame(gameType)
      }
    }
  }, [])

  // 리더보드 데이터 로드
  const loadLeaderboard = async () => {
    setLoading(true)
    // console.log('리더보드 로딩 시작...') // 디버깅용
    try {
      const params = new URLSearchParams({
        gameType: selectedGame,
        period: selectedPeriod,
        category: selectedCategory,
        limit: '20'
      })
      
      const response = await fetch(`/api/leaderboard?${params}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      const data = await response.json()
      
              // console.log('리더보드 데이터:', data) // 디버깅용
      
      if (data.success) {
        // console.log('리더보드 로딩 성공!') // 디버깅용
        setLeaderboardData({
          ...data,
          gameType: selectedGame,
          period: selectedPeriod,
          category: selectedCategory
        })
      } else {
        console.error('리더보드 로딩 실패:', data)
      }
    } catch (error) {
      console.error('리더보드 로드 오류:', error)
      alert('순위표를 불러오는데 실패했습니다. 다시 시도해주세요.')
    }
    setLoading(false)
  }

  useEffect(() => {
    loadLeaderboard()
  }, [selectedGame, selectedPeriod, selectedCategory])

  // 페이지 포커스 시 자동 새로고침
  useEffect(() => {
    const handleFocus = () => {
      loadLeaderboard()
    }
    
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [selectedGame, selectedPeriod, selectedCategory])

  // 10초마다 자동 새로고침
  useEffect(() => {
    const interval = setInterval(() => {
      loadLeaderboard()
    }, 10000) // 10초
    
    return () => clearInterval(interval)
  }, [selectedGame, selectedPeriod, selectedCategory])

  // 순위 아이콘 렌더링
  const renderRankIcon = (rank: number) => {
    if (rank <= 3) {
      const Icon = RANK_ICONS[rank as keyof typeof RANK_ICONS]
      const colorClass = RANK_COLORS[rank as keyof typeof RANK_COLORS]
      return <Icon className={`w-6 h-6 ${colorClass}`} />
    }
    return (
      <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-600">
        {rank}
      </div>
    )
  }

  // 게임별 리더보드 렌더링
  const renderGameLeaderboard = (entries: LeaderboardEntry[], title: string, gameType: string) => {
    const GameIcon = GAME_ICONS[gameType as keyof typeof GAME_ICONS] || Trophy
    
    return (
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <GameIcon className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-primary-700">{title}</h3>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {entries.slice(0, 5).map((entry, index) => (
              <motion.div
                key={entry.playerId}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  entry.playerId === user?.memberId ? 'bg-primary-50 border border-primary-200' : 'bg-gray-50'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center space-x-3">
                  {renderRankIcon(index + 1)}
                  <div>
                    <p className="font-medium text-gray-900">{entry.playerName}</p>
                    {entry.createdAt && (
                      <p className="text-xs text-gray-500">
                        {formatDate.relative(new Date(entry.createdAt))}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary-600">
                    {entry.scoreValue?.toLocaleString()}
                  </p>
                  {entry.level && (
                    <p className="text-xs text-gray-500">Lv.{entry.level}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // 상세 리더보드 렌더링
  const renderDetailedLeaderboard = (entries: LeaderboardEntry[]) => (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-semibold text-primary-700">
              {GAME_NAMES[selectedGame as keyof typeof GAME_NAMES]} 순위표
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4 mr-1" />
              필터
            </Button>
          </div>
        </div>
        
        {/* 필터 옵션 */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">게임</label>
                  <select
                    value={selectedGame}
                    onChange={(e) => setSelectedGame(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">전체 게임</option>
                    <option value="tetris">테트리스</option>
                    <option value="wordchain">끝말잇기</option>
                    <option value="cardgame">원카드</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">기간</label>
                  <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="all">전체 기간</option>
                    <option value="weekly">이번 주</option>
                    <option value="monthly">이번 달</option>
                    <option value="yearly">올해</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">분류</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="score">점수</option>
                    <option value="level">레벨</option>
                    <option value="wins">승수</option>
                    <option value="streak">연승</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          {entries.map((entry, index) => (
            <motion.div
              key={entry.playerId}
              className={`flex items-center justify-between p-4 rounded-lg transition-all ${
                entry.playerId === user?.memberId 
                  ? 'bg-primary-50 border-2 border-primary-200 shadow-md' 
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className="flex items-center space-x-4">
                {renderRankIcon(entry.rank)}
                <div>
                  <div className="flex items-center space-x-2">
                    <p className="font-medium text-gray-900">{entry.playerName}</p>
                    {entry.isNewRecord && (
                      <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">
                        신기록!
                      </span>
                    )}
                    {entry.isPersonalBest && (
                      <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">
                        개인최고
                      </span>
                    )}
                  </div>
                  {entry.createdAt && (
                    <p className="text-xs text-gray-500">
                      {formatDate.relative(new Date(entry.createdAt))}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-xl font-bold text-primary-600">
                  {(entry.score || entry.scoreValue)?.toLocaleString()}점
                </p>
                <div className="flex space-x-4 text-xs text-gray-500">
                  {entry.level && <span>Lv.{entry.level}</span>}
                  {entry.duration && <span>{Math.round(entry.duration / 60)}분</span>}
                  {entry.winRate !== undefined && <span>승률 {entry.winRate}%</span>}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* 헤더 */}
      <header className="glass-nav fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <motion.button
              className="glass-button p-2"
              onClick={() => router.push('/games')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="w-5 h-5 text-primary-600" />
            </motion.button>
            <h1 className="text-xl font-bold text-gradient">게임 순위표</h1>
            <div className="flex items-center space-x-2">
              <Button 
                variant="glass" 
                size="sm" 
                onClick={loadLeaderboard}
                disabled={loading}
                title="새로고침"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* 통계 요약 */}
              {leaderboardData?.statistics && (
                <motion.div
                  className="grid grid-cols-1 md:grid-cols-5 gap-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className="p-4 text-center">
                    <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {leaderboardData.statistics.totalPlayers}
                    </p>
                    <p className="text-sm text-gray-500">총 플레이어</p>
                  </Card>
                  
                  <Card className="p-4 text-center">
                    <Gamepad2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {leaderboardData.statistics.totalGames}
                    </p>
                    <p className="text-sm text-gray-500">총 게임</p>
                  </Card>
                  
                  <Card className="p-4 text-center">
                    <BarChart3 className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {leaderboardData.statistics.averageScore}
                    </p>
                    <p className="text-sm text-gray-500">평균 점수</p>
                  </Card>
                  
                  <Card className="p-4 text-center">
                    <Target className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {leaderboardData.statistics.highestScore?.score || 0}
                    </p>
                    <p className="text-sm text-gray-500">최고 점수</p>
                  </Card>
                  
                  <Card className="p-4 text-center">
                    <Clock className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">
                      {leaderboardData.statistics.totalPlayTime}
                    </p>
                    <p className="text-sm text-gray-500">총 플레이 시간 (분)</p>
                  </Card>
                </motion.div>
              )}

              {/* 전체 게임 보기 */}
              {selectedGame === 'all' && leaderboardData?.gameSpecific ? (
                <div className="space-y-8">
                  <motion.div
                    className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {renderGameLeaderboard(leaderboardData.gameSpecific.tetris, '테트리스', 'tetris')}
                    {renderGameLeaderboard(leaderboardData.gameSpecific.wordchain, '끝말잇기', 'wordchain')}
                    {renderGameLeaderboard(leaderboardData.gameSpecific.cardgame, '원카드', 'cardgame')}
                  </motion.div>

                  {/* 종합 순위 */}
                  {leaderboardData.overall && (
                    <motion.div
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      {renderDetailedLeaderboard(leaderboardData.overall)}
                    </motion.div>
                  )}
                </div>
              ) : (
                /* 특정 게임 상세 보기 */
                leaderboardData?.leaderboard && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {renderDetailedLeaderboard(leaderboardData.leaderboard)}
                  </motion.div>
                )
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
} 