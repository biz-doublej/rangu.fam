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
  Gift,
  Plus,
  Minus
} from 'lucide-react'
import { Button } from './Button'
import { Card, CardContent, CardHeader } from './Card'

interface AdvancedCardCraftingProps {
  userId?: string
  className?: string
}

interface CraftingResult {
  success: boolean
  card?: any
  message: string
  usedCards: { cardId: string; quantity: number }[]
}

interface UserCard {
  _id: string
  cardId: string
  quantity: number
  cardInfo: {
    name: string
    type: string
    rarity: string
    imageUrl: string
    member?: string
  }
}

interface CraftingSlot {
  id: string
  card?: UserCard
  requiredType?: string
  maxQuantity?: number
}

// 프레스티지 카드 미리보기 데이터
const prestigeCards = [
  { id: 'prestige_jaewon', name: '재원 프레스티지', member: '재원', emoji: '👨‍💻' },
  { id: 'prestige_minseok', name: '민석 프레스티지', member: '민석', emoji: '🏔️' },
  { id: 'prestige_jinkyu', name: '진규 프레스티지', member: '진규', emoji: '🪖' },
  { id: 'prestige_hanul', name: '한울 프레스티지', member: '한울', emoji: '🎮' },
  { id: 'prestige_seungchan', name: '승찬 프레스티지', member: '승찬', emoji: '🌟' }
]

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

export function AdvancedCardCrafting({ userId, className = '' }: AdvancedCardCraftingProps) {
  const [isCrafting, setIsCrafting] = useState(false)
  const [craftingResult, setCraftingResult] = useState<CraftingResult | null>(null)
  const [showResultModal, setShowResultModal] = useState(false)
  const [userStats, setUserStats] = useState<any>(null)
  const [userCards, setUserCards] = useState<UserCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showInventory, setShowInventory] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)

  // 조합 슬롯 설정
  const [craftingSlots, setCraftingSlots] = useState<CraftingSlot[]>([
    { id: 'year1', requiredType: 'year', maxQuantity: 7 },
    { id: 'year2', requiredType: 'year', maxQuantity: 7 },
    { id: 'year3', requiredType: 'year', maxQuantity: 7 },
    { id: 'special1', requiredType: 'special', maxQuantity: 3 },
    { id: 'special2', requiredType: 'special', maxQuantity: 3 },
    { id: 'signature1', requiredType: 'signature', maxQuantity: 1 }
  ])

  // 사용자 통계 및 카드 조회
  const fetchUserData = async () => {
    if (!userId) return

    try {
      // 통계 조회
      const statsResponse = await fetch(`/api/cards/stats?userId=${userId}`)
      const statsData = await statsResponse.json()
      if (statsData.success) {
        setUserStats(statsData.stats)
      }

      // 카드 조회
      const cardsResponse = await fetch(`/api/cards/inventory?userId=${userId}&limit=100`)
      const cardsData = await cardsResponse.json()
      if (cardsData.success) {
        setUserCards(cardsData.inventory)
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUserData()
  }, [userId])

  // 슬롯에 카드 추가
  const addCardToSlot = (slotId: string, card: UserCard) => {
    setCraftingSlots(prev => 
      prev.map(slot => 
        slot.id === slotId 
          ? { ...slot, card }
          : slot
      )
    )
    setShowInventory(false)
    setSelectedSlot(null)
  }

  // 슬롯에서 카드 제거
  const removeCardFromSlot = (slotId: string) => {
    setCraftingSlots(prev => 
      prev.map(slot => 
        slot.id === slotId 
          ? { ...slot, card: undefined }
          : slot
      )
    )
  }

  // 조합 가능 여부 확인
  const canCraft = () => {
    const yearCards = craftingSlots.filter(slot => slot.requiredType === 'year' && slot.card).length
    const specialCards = craftingSlots.filter(slot => slot.requiredType === 'special' && slot.card).length
    const signatureCards = craftingSlots.filter(slot => slot.requiredType === 'signature' && slot.card).length
    
    return yearCards >= 1 && specialCards >= 1 && signatureCards >= 1
  }

  // 프레스티지 카드 조합
  const handleCrafting = async () => {
    if (!userId || isCrafting || !canCraft()) return

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
          useMaterialCard: false
        })
      })

      const result: CraftingResult = await response.json()
      setCraftingResult(result)
      setShowResultModal(true)
      
      // 성공하면 슬롯 초기화
      if (result.success) {
        setCraftingSlots(prev => prev.map(slot => ({ ...slot, card: undefined })))
      }
      
      // 데이터 새로고침
      await fetchUserData()
      
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
          <h3 className="text-lg font-semibold text-gray-700 mb-2">고급 카드 조합</h3>
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
              <h2 className="text-xl font-bold text-gray-800">고급 카드 조합</h2>
              <p className="text-sm text-gray-500">프레스티지 카드를 제작하세요</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 프레스티지 카드 미리보기 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">🏆 획득 가능한 프레스티지 카드</h3>
            <div className="grid grid-cols-5 gap-3">
              {prestigeCards.map((card, index) => (
                <motion.div
                  key={card.id}
                  className="aspect-[3/4] bg-gradient-to-br from-yellow-100 to-orange-200 rounded-lg border-2 border-yellow-300 flex flex-col items-center justify-center p-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="text-2xl mb-1">{card.emoji}</div>
                  <div className="text-xs font-medium text-center text-gray-800 leading-tight">
                    {card.name}
                  </div>
                  <div className="mt-1 px-1 py-0.5 bg-yellow-400 text-yellow-900 text-xs rounded font-bold">
                    전설
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* 조합 슬롯 */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-3">🔧 조합 재료</h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-4">
              {craftingSlots.map((slot, index) => (
                <motion.div
                  key={slot.id}
                  className={`aspect-[3/4] border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-2 cursor-pointer transition-all duration-300 ${
                    slot.card 
                      ? 'border-green-300 bg-green-50' 
                      : 'border-gray-300 bg-gray-50 hover:border-primary-300 hover:bg-primary-25'
                  }`}
                  onClick={() => {
                    if (slot.card) {
                      removeCardFromSlot(slot.id)
                    } else {
                      setSelectedSlot(slot.id)
                      setShowInventory(true)
                    }
                  }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  {slot.card ? (
                    <>
                      <div className="flex-1 flex items-center justify-center text-lg">
                        {slot.card.cardInfo.member ? 
                          {'재원': '👨‍💻', '민석': '🏔️', '진규': '🪖', '한울': '🎮', '승찬': '🌟', '희열': '🔮'}[slot.card.cardInfo.member] || '👤'
                          : slot.card.cardInfo.type === 'year' ? '📅'
                          : slot.card.cardInfo.type === 'special' ? '⭐'
                          : slot.card.cardInfo.type === 'signature' ? '✨'
                          : '🎴'
                        }
                      </div>
                      <div className="text-xs text-center font-medium text-gray-800 leading-tight">
                        {slot.card.cardInfo.name}
                      </div>
                      <button 
                        className="mt-1 p-1 rounded-full bg-red-500 text-white hover:bg-red-600"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeCardFromSlot(slot.id)
                        }}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Plus className="w-6 h-6 text-gray-400 mb-1" />
                      <div className="text-xs text-center text-gray-500">
                        {slot.requiredType === 'year' ? '년도 카드' :
                         slot.requiredType === 'special' ? '스페셜 카드' :
                         slot.requiredType === 'signature' ? '시그니처 카드' : '카드'}
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </div>

            {/* 조합 버튼 */}
            <div className="text-center">
              <Button
                variant="primary"
                size="lg"
                onClick={handleCrafting}
                disabled={isCrafting || !canCraft()}
                className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
              >
                {isCrafting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>조합 중...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Zap className="w-5 h-5" />
                    <span>프레스티지 카드 조합</span>
                  </div>
                )}
              </Button>
              {!canCraft() && (
                <p className="text-sm text-gray-500 mt-2">
                  최소 년도 카드 1개, 스페셜 카드 1개, 시그니처 카드 1개가 필요합니다
                </p>
              )}
            </div>
          </div>

          {/* 조합 통계 */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-gray-800">{userStats?.craftingAttempts || 0}</div>
              <div className="text-sm text-gray-600">총 시도</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">{userStats?.successfulCrafts || 0}</div>
              <div className="text-sm text-gray-600">성공</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-xl font-bold text-yellow-600">70%</div>
              <div className="text-sm text-gray-600">성공률</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 인벤토리 모달 */}
      <AnimatePresence>
        {showInventory && selectedSlot && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowInventory(false)}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {craftingSlots.find(s => s.id === selectedSlot)?.requiredType === 'year' ? '년도 카드' :
                     craftingSlots.find(s => s.id === selectedSlot)?.requiredType === 'special' ? '스페셜 카드' :
                     craftingSlots.find(s => s.id === selectedSlot)?.requiredType === 'signature' ? '시그니처 카드' : '카드'} 선택
                  </h3>
                  <button
                    onClick={() => setShowInventory(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                  {userCards
                    .filter(card => {
                      const requiredType = craftingSlots.find(s => s.id === selectedSlot)?.requiredType
                      return card.cardInfo.type === requiredType
                    })
                    .map((card) => (
                      <motion.div
                        key={card._id}
                        className="aspect-[3/4] bg-white rounded-lg border border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all duration-300 cursor-pointer p-2"
                        onClick={() => addCardToSlot(selectedSlot, card)}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className="h-full flex flex-col">
                          <div className="flex-1 flex items-center justify-center text-lg bg-gray-50 rounded mb-1">
                            {card.cardInfo.member ? 
                              {'재원': '👨‍💻', '민석': '🏔️', '진규': '🪖', '한울': '🎮', '승찬': '🌟', '희열': '🔮'}[card.cardInfo.member] || '👤'
                              : card.cardInfo.type === 'year' ? '📅'
                              : card.cardInfo.type === 'special' ? '⭐'
                              : card.cardInfo.type === 'signature' ? '✨'
                              : '🎴'
                            }
                          </div>
                          <div className="text-xs text-center font-medium text-gray-800 leading-tight">
                            {card.cardInfo.name}
                          </div>
                          {card.quantity > 1 && (
                            <div className="text-xs text-center text-gray-500 mt-1">
                              ×{card.quantity}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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

              <div className="p-6">
                {craftingResult.success && craftingResult.card ? (
                  <div className="text-center mb-4">
                    <div className="w-24 h-32 mx-auto mb-3 bg-gradient-to-br from-yellow-100 to-orange-200 rounded-lg flex items-center justify-center">
                      <div className="text-3xl">👑</div>
                    </div>
                    <h3 className="text-lg font-bold text-gray-800 mb-1">
                      {(craftingResult.card as any)?.name || '프레스티지 카드'}
                    </h3>
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
