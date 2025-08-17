'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Package, 
  Sparkles, 
  Clock, 
  Gift,
  Star,
  Zap,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react'
import { Button } from './Button'
import { Card, CardContent } from './Card'

interface CardDropWidgetProps {
  userId?: string
  className?: string
}

interface DroppedCard {
  cardId: string
  name: string
  type: string
  rarity: string
  description: string
  imageUrl: string
  member?: string
  year?: number
  period?: string
}

interface DropResult {
  success: boolean
  card?: DroppedCard
  message: string
  remainingDrops: number
}

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case 'basic':
      return 'from-gray-400 to-gray-600'
    case 'rare':
      return 'from-blue-400 to-purple-600'
    case 'epic':
      return 'from-pink-400 to-rose-600'
    case 'legendary':
      return 'from-yellow-400 to-orange-600'
    case 'material':
      return 'from-green-400 to-teal-600'
    default:
      return 'from-gray-400 to-gray-600'
  }
}

const getRarityIcon = (rarity: string) => {
  switch (rarity) {
    case 'basic':
      return Package
    case 'rare':
      return Star
    case 'epic':
      return Sparkles
    case 'legendary':
      return Zap
    case 'material':
      return Gift
    default:
      return Package
  }
}

export function CardDropWidget({ userId, className = '' }: CardDropWidgetProps) {
  const [remainingDrops, setRemainingDrops] = useState(999)
  const [isDropping, setIsDropping] = useState(false)
  const [lastDroppedCard, setLastDroppedCard] = useState<DroppedCard | null>(null)
  const [showCardModal, setShowCardModal] = useState(false)
  const [dropMessage, setDropMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  // 남은 드랍 횟수 조회
  const fetchRemainingDrops = async () => {
    if (!userId) return
    
    try {
      const response = await fetch(`/api/cards/drop?userId=${userId}`)
      const data = await response.json()
      
      if (data.success) {
        setRemainingDrops(data.remainingDrops)
      }
    } catch (error) {
      console.error('Failed to fetch remaining drops:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchRemainingDrops()
  }, [userId])

  // 카드 드랍 실행
  const handleCardDrop = async () => {
    if (!userId || isDropping || remainingDrops <= 0) return

    setIsDropping(true)
    setDropMessage('')

    try {
      const response = await fetch('/api/cards/drop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId })
      })

      const result: DropResult = await response.json()
      
      setDropMessage(result.message)
      setRemainingDrops(result.remainingDrops)
      
      if (result.success && result.card) {
        setLastDroppedCard(result.card)
        setShowCardModal(true)
      }
      
    } catch (error) {
      console.error('Card drop error:', error)
      setDropMessage('카드 드랍 중 오류가 발생했습니다.')
    } finally {
      setIsDropping(false)
    }
  }

  if (!userId) {
    return (
      <Card className={`${className} opacity-50`}>
        <CardContent className="p-4 text-center">
          <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">로그인이 필요합니다</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-4 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-2"></div>
          <p className="text-sm text-gray-500">로딩 중...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={className}>
        <CardContent className="p-4">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Package className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-800">카드 드랍</h3>
                <p className="text-xs text-gray-500">랑구 친구들을 소장해보세요</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3 text-gray-400" />
                <span className="text-xs font-medium text-gray-600">무제한</span>
              </div>
              <p className="text-xs text-gray-500">언제든 드랍 가능</p>
            </div>
          </div>

          {/* 드랍 버튼 */}
          <Button
            variant="glass"
            className="w-full mb-3 relative overflow-hidden"
            onClick={handleCardDrop}
            disabled={isDropping}
          >
            <AnimatePresence mode="wait">
              {isDropping ? (
                <motion.div
                  key="dropping"
                  className="flex items-center space-x-2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                  <span>카드 뽑는 중...</span>
                </motion.div>
              ) : (
                <motion.div
                  key="available"
                  className="flex items-center space-x-2"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>카드 뽑기</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Button>

          {/* 메시지 */}
          <AnimatePresence>
            {dropMessage && (
              <motion.div
                className={`text-xs p-2 rounded-lg mb-2 flex items-center space-x-2 ${
                  dropMessage.includes('획득') || dropMessage.includes('성공')
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-orange-50 text-orange-700 border border-orange-200'
                }`}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                {dropMessage.includes('획득') || dropMessage.includes('성공') ? (
                  <CheckCircle className="w-3 h-3 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                )}
                <span>{dropMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 무제한 안내 */}
          <div className="mb-2">
            <div className="text-center">
              <div className="text-xs text-purple-600 font-medium mb-1">🎉 무제한 드랍</div>
              <div className="w-full bg-gradient-to-r from-purple-200 to-pink-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full animate-pulse"
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          {/* 안내 텍스트 */}
          <div className="text-xs text-gray-500 text-center">
            언제든지 원하는 만큼 카드를 뽑을 수 있어요! 🎴
          </div>
        </CardContent>
      </Card>

      {/* 카드 획득 모달 */}
      <AnimatePresence>
        {showCardModal && lastDroppedCard && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCardModal(false)}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 모달 헤더 */}
              <div className={`bg-gradient-to-r ${getRarityColor(lastDroppedCard.rarity)} p-4 text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {React.createElement(getRarityIcon(lastDroppedCard.rarity), {
                      className: "w-5 h-5"
                    })}
                    <span className="font-semibold">새 카드 획득!</span>
                  </div>
                  <button
                    onClick={() => setShowCardModal(false)}
                    className="p-1 hover:bg-white/20 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 카드 정보 */}
              <div className="p-6">
                <div className="text-center mb-4">
                  <div className="w-24 h-32 mx-auto mb-3 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center overflow-hidden">
                    {lastDroppedCard.imageUrl ? (
                      <img 
                        src={lastDroppedCard.imageUrl} 
                        alt={lastDroppedCard.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-2xl">
                        {lastDroppedCard.member ? 
                          {'재원': '👨‍💻', '민석': '🏔️', '진규': '🪖', '한울': '🎮', '승찬': '🌟', '희열': '🔮'}[lastDroppedCard.member] || '👤'
                          : '🎴'
                        }
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">
                    {lastDroppedCard.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    {lastDroppedCard.description}
                  </p>
                  <div className="flex items-center justify-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getRarityColor(lastDroppedCard.rarity)} text-white`}>
                      {lastDroppedCard.rarity === 'basic' ? '베이직' :
                       lastDroppedCard.rarity === 'rare' ? '레어' :
                       lastDroppedCard.rarity === 'epic' ? '에픽' :
                       lastDroppedCard.rarity === 'legendary' ? '레전더리' :
                       lastDroppedCard.rarity === 'material' ? '재료' : lastDroppedCard.rarity}
                    </span>
                    {lastDroppedCard.year && (
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700">
                        {lastDroppedCard.year}년 {lastDroppedCard.period === 'h1' ? '상반기' : '하반기'}
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  variant="glass"
                  className="w-full"
                  onClick={() => setShowCardModal(false)}
                >
                  확인
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
