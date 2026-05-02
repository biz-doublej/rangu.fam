'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Hammer, 
  Sparkles, 
  AlertTriangle,
  CheckCircle,
  X,
  Package,
  Zap,
  Star,
  Gift
} from 'lucide-react'
import { Button } from './Button'
import { Card, CardContent, CardHeader } from './Card'

interface CardCraftingProps {
  userId?: string
  className?: string
}

interface CraftingResult {
  success: boolean
  card?: any
  message: string
  usedCards: { cardId: string; quantity: number }[]
}

export function CardCrafting({ userId, className = '' }: CardCraftingProps) {
  const [isCrafting, setIsCrafting] = useState(false)
  const [craftingResult, setCraftingResult] = useState<CraftingResult | null>(null)
  const [showResultModal, setShowResultModal] = useState(false)
  const [userStats, setUserStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // 사용자 통계 조회
  const fetchUserStats = async () => {
    if (!userId) return

    try {
      const response = await fetch(`/api/cards/stats?userId=${userId}`)
      const data = await response.json()
      
      if (data.success) {
        setUserStats(data.stats)
      }
    } catch (error) {
      console.error('Failed to fetch user stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUserStats()
  }, [userId])

  // 프레스티지 카드 조합
  const handleCrafting = async (useMaterialCard: boolean = false) => {
    if (!userId || isCrafting) return

    setIsCrafting(true)
    setCraftingResult(null)

    try {
      const response = await fetch('/api/cards/craft', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          useMaterialCard
        })
      })

      const result: CraftingResult = await response.json()
      setCraftingResult(result)
      setShowResultModal(true)
      
      // 통계 새로고침
      await fetchUserStats()
      
    } catch (error) {
      console.error('Crafting error:', error)
      setCraftingResult({
        success: false,
        message: '조합 중 오류가 발생했습니다.',
        usedCards: []
      })
      setShowResultModal(true)
    } finally {
      setIsCrafting(false)
    }
  }

  if (!userId) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <Hammer className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">카드 조합</h3>
          <p className="text-gray-500">로그인 후 프레스티지 카드를 조합하세요</p>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-500">데이터를 불러오고 있습니다...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
              <Hammer className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">카드 조합</h2>
              <p className="text-sm text-gray-500">프레스티지 카드를 제작하세요</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 조합 통계 */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-800">{userStats?.craftingAttempts || 0}</div>
              <div className="text-sm text-gray-600">총 시도</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{userStats?.successfulCrafts || 0}</div>
              <div className="text-sm text-gray-600">성공</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{userStats?.failedCrafts || 0}</div>
              <div className="text-sm text-gray-600">실패</div>
            </div>
          </div>

          {/* 조합 방법 1: 조커카드 대체 사용 */}
          <div className="border border-green-200 rounded-xl p-4 bg-green-50">
            <div className="flex items-center space-x-2 mb-3">
              <Gift className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-green-800">조커카드 대체 조합</h3>
              <span className="px-2 py-1 bg-green-200 text-green-800 text-xs rounded-full">조커 소모</span>
            </div>
            <p className="text-sm text-green-700 mb-4">
              조커카드 1장은 부족한 재료 1장을 대체하며 조합 시 소모됩니다.
            </p>
            <div className="flex items-center justify-between">
              <div className="text-sm text-green-600">
                <span className="font-medium">보유 조커카드:</span> {userStats?.materialCardsOwned || 0}장
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleCrafting(true)}
                disabled={isCrafting || !userStats?.materialCardsOwned}
                className="bg-green-600 hover:bg-green-700"
              >
                {isCrafting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>조합 중...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Gift className="w-4 h-4" />
                    <span>조커 대체 조합</span>
                  </div>
                )}
              </Button>
            </div>
          </div>

          {/* 조합 방법 2: 일반 카드 조합 */}
          <div className="border border-purple-200 rounded-xl p-4 bg-purple-50">
            <div className="flex items-center space-x-2 mb-3">
              <Zap className="w-5 h-5 text-purple-600" />
              <h3 className="font-semibold text-purple-800">일반 카드 조합</h3>
              <span className="px-2 py-1 bg-red-200 text-red-800 text-xs rounded-full">카드 소모</span>
            </div>
            <p className="text-sm text-purple-700 mb-4">
              년도 카드 7개 + 스페셜 카드 3개 + 시그니처 카드 1개를 사용하여 조합합니다.
              조합에 사용된 카드는 사라집니다.
            </p>
            
            {/* 필요 카드 현황 */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">년도 카드</span>
                <span className={`font-medium ${userStats?.basicCardsOwned >= 7 ? 'text-green-600' : 'text-red-600'}`}>
                  {userStats?.basicCardsOwned || 0}/7
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">스페셜 카드</span>
                <span className={`font-medium ${userStats?.rareCardsOwned >= 3 ? 'text-green-600' : 'text-red-600'}`}>
                  {userStats?.rareCardsOwned || 0}/3
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">시그니처 카드</span>
                <span className={`font-medium ${userStats?.epicCardsOwned >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                  {userStats?.epicCardsOwned || 0}/1
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-purple-600">
                <span className="font-medium">성공률:</span> 70% (30% 확률로 실패)
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleCrafting(false)}
                disabled={
                  isCrafting || 
                  !userStats?.basicCardsOwned || userStats.basicCardsOwned < 7 ||
                  !userStats?.rareCardsOwned || userStats.rareCardsOwned < 3 ||
                  !userStats?.epicCardsOwned || userStats.epicCardsOwned < 1
                }
                className="bg-purple-600 hover:bg-purple-700"
              >
                {isCrafting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>조합 중...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4" />
                    <span>일반 조합</span>
                  </div>
                )}
              </Button>
            </div>
          </div>

          {/* 프레스티지 카드 정보 */}
          <div className="border border-yellow-200 rounded-xl p-4 bg-yellow-50">
            <div className="flex items-center space-x-2 mb-3">
              <Sparkles className="w-5 h-5 text-yellow-600" />
              <h3 className="font-semibold text-yellow-800">프레스티지 카드</h3>
              <span className="px-2 py-1 bg-yellow-200 text-yellow-800 text-xs rounded-full">초희귀</span>
            </div>
            <p className="text-sm text-yellow-700 mb-3">
              17.5% 확률로 멤버 개인 프레스티지 카드, 나머지는 특별 단체 프레스티지 카드를 획득합니다.
            </p>
            <div className="text-sm text-yellow-600">
              <span className="font-medium">보유 프레스티지 카드:</span> {userStats?.legendaryCardsOwned || 0}장
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 조합 결과 모달 */}
      <AnimatePresence>
        {showResultModal && craftingResult && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowResultModal(false)}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 모달 헤더 */}
              <div className={`p-4 text-white ${
                craftingResult.success 
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                  : 'bg-gradient-to-r from-red-500 to-pink-600'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {craftingResult.success ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5" />
                    )}
                    <span className="font-semibold">
                      {craftingResult.success ? '조합 성공!' : '조합 실패'}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowResultModal(false)}
                    className="p-1 hover:bg-white/20 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 모달 내용 */}
              <div className="p-6">
                {craftingResult.success && craftingResult.card ? (
                  <div className="text-center mb-4">
                    <div className="w-24 h-32 mx-auto mb-3 bg-gradient-to-br from-yellow-100 to-orange-200 rounded-lg flex items-center justify-center overflow-hidden">
                      {craftingResult.card.imageUrl ? (
                        <img 
                          src={craftingResult.card.imageUrl} 
                          alt={craftingResult.card.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-3xl">👑</div>
                      )}
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">
                      {craftingResult.card.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {craftingResult.card.description}
                    </p>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-400 to-orange-600 text-white">
                      프레스티지 카드
                    </span>
                  </div>
                ) : (
                  <div className="text-center mb-4">
                    <div className="w-16 h-16 mx-auto mb-3 bg-gray-100 rounded-full flex items-center justify-center">
                      <X className="w-8 h-8 text-gray-400" />
                    </div>
                  </div>
                )}

                <p className="text-sm text-gray-600 text-center mb-4">
                  {craftingResult.message}
                </p>

                {/* 사용된 카드 표시 */}
                {craftingResult.usedCards.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3 mb-4">
                    <h4 className="text-sm font-medium text-gray-800 mb-2">사용된 카드:</h4>
                    <div className="space-y-1">
                      {craftingResult.usedCards.map((usedCard, index) => (
                        <div key={index} className="flex justify-between text-sm text-gray-600">
                          <span>{usedCard.cardId}</span>
                          <span>×{usedCard.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  variant="glass"
                  className="w-full"
                  onClick={() => setShowResultModal(false)}
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
