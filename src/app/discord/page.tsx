'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Bot, 
  Server, 
  Music, 
  Users, 
  Activity, 
  Settings,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Shuffle,
  Repeat,
  Monitor,
  TrendingUp,
  Clock,
  Link
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'

interface BotStatus {
  status: 'online' | 'idle' | 'dnd' | 'offline'
  servers: { total: number; active: number }
  uptime: number
  lastHeartbeat: string
}

interface ServerStats {
  activeServers: { count: number; list: any[] }
  popularCommands: any[]
  period: string
}

interface LinkCode {
  code: string
  expiresAt: Date
}

export default function DiscordPage() {
  const router = useRouter()
  const { user } = useAuth()
  
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null)
  const [serverStats, setServerStats] = useState<ServerStats | null>(null)
  const [linkCode, setLinkCode] = useState<LinkCode | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'servers' | 'link' | 'queue'>('overview')

  // 봇 상태 조회
  const fetchBotStatus = async () => {
    try {
      const response = await fetch('/api/discord/bot?botId=rangu-bot')
      const data = await response.json()
      
      if (data.success) {
        setBotStatus(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch bot status:', error)
    }
  }

  // 서버 통계 조회
  const fetchServerStats = async () => {
    try {
      const response = await fetch('/api/discord/stats?type=overview&days=7')
      const data = await response.json()
      
      if (data.success) {
        setServerStats(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch server stats:', error)
    }
  }

  // 연동 코드 생성
  const generateLinkCode = async () => {
    if (!user) return

    try {
      const response = await fetch('/api/discord/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateCode',
          discordId: 'temp-' + Date.now(), // 임시 ID
          discordUsername: user.username
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setLinkCode({
          code: data.data.linkCode,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10분 후 만료
        })
      }
    } catch (error) {
      console.error('Failed to generate link code:', error)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([
        fetchBotStatus(),
        fetchServerStats()
      ])
      setIsLoading(false)
    }

    loadData()

    // 10초마다 상태 업데이트
    const interval = setInterval(() => {
      fetchBotStatus()
      fetchServerStats()
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return `${hours}시간 ${minutes}분`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500'
      case 'idle': return 'text-yellow-500'
      case 'dnd': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return '온라인'
      case 'idle': return '자리비움'
      case 'dnd': return '다른 용무 중'
      default: return '오프라인'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">디스코드 봇 정보를 불러오고 있습니다...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/')}
                className="p-2"
              >
                ←
              </Button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-[#5865F2] rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Rangu.fam Discord Bot</h1>
                  <p className="text-sm text-gray-600">디스코드 봇 관리 및 모니터링</p>
                </div>
              </div>
            </div>
            
            {botStatus && (
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${botStatus.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className={`text-sm font-medium ${getStatusColor(botStatus.status)}`}>
                  {getStatusText(botStatus.status)}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 탭 네비게이션 */}
      <nav className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: '개요', icon: Monitor },
              { id: 'servers', label: '서버', icon: Server },
              { id: 'link', label: '계정 연동', icon: Link },
              { id: 'queue', label: '음악 큐', icon: Music }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  selectedTab === tab.id
                    ? 'border-[#5865F2] text-[#5865F2]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {selectedTab === 'overview' && (
          <div className="space-y-6">
            {/* 봇 상태 카드 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">봇 상태</p>
                        <p className={`text-2xl font-bold ${getStatusColor(botStatus?.status || 'offline')}`}>
                          {getStatusText(botStatus?.status || 'offline')}
                        </p>
                      </div>
                      <Activity className={`w-8 h-8 ${getStatusColor(botStatus?.status || 'offline')}`} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">활성 서버</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {botStatus?.servers.active || 0} / {botStatus?.servers.total || 0}
                        </p>
                      </div>
                      <Server className="w-8 h-8 text-blue-500" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">가동 시간</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {botStatus ? formatUptime(botStatus.uptime) : '0시간 0분'}
                        </p>
                      </div>
                      <Clock className="w-8 h-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            {/* 인기 명령어 */}
            {serverStats?.popularCommands && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card>
                  <CardHeader>
                    <h2 className="text-lg font-semibold flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2 text-orange-500" />
                      인기 명령어 ({serverStats.period})
                    </h2>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {serverStats.popularCommands.slice(0, 5).map((cmd, index) => (
                        <div key={cmd.command} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <span className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                              {index + 1}
                            </span>
                            <span className="font-medium">!{cmd.command}</span>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">{cmd.count}회 사용</p>
                            <p className="text-xs text-gray-500">{cmd.uniqueUsers}명 사용</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        )}

        {selectedTab === 'link' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">디스코드 계정 연동</h2>
                <p className="text-sm text-gray-600">
                  디스코드에서 <code>!link</code> 명령어를 사용하여 생성된 코드를 입력하세요.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {!linkCode ? (
                  <div className="text-center py-8">
                    <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 mb-4">디스코드에서 연동 코드를 생성해주세요.</p>
                    <p className="text-sm text-gray-500 bg-gray-100 p-3 rounded-lg mb-4">
                      디스코드 채팅에서 <code className="bg-gray-200 px-2 py-1 rounded">!link</code> 명령어를 입력하세요.
                    </p>
                    <Button onClick={generateLinkCode} disabled={!user}>
                      테스트 코드 생성
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-4">
                      <h3 className="text-lg font-semibold text-green-800 mb-2">연동 코드 생성됨</h3>
                      <div className="bg-white border-2 border-green-300 rounded-lg p-4 mb-4">
                        <code className="text-2xl font-bold text-green-600 tracking-wider">
                          {linkCode.code}
                        </code>
                      </div>
                      <p className="text-sm text-green-700">
                        이 코드는 10분 후 만료됩니다.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* 다른 탭들도 비슷하게 구현... */}
      </main>
    </div>
  )
}