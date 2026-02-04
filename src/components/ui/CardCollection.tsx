'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Package, 
  Search, 
  Filter,
  Lock,
  Unlock,
  Heart
} from 'lucide-react'
import { Button } from './Button'
import { Card, CardContent, CardHeader } from './Card'
import { Input } from './Input'

const FALLBACK_IMAGE = '/images/default-music-cover.jpg'

interface CardCollectionProps {
  userId?: string
  className?: string
}

interface UserCard {
  _id: string
  cardId: string
  quantity: number
  acquiredAt: string
  isFavorite: boolean
  isLocked: boolean
  cardInfo: {
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
}

// 전체 카드 슬롯 설정
const TOTAL_SLOTS = 48

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

const getRarityName = (rarity: string) => {
  const names: Record<string, string> = {
    'basic': '베이직',
    'rare': '레어',
    'epic': '에픽',
    'legendary': '레전더리',
    'material': '재료'
  }
  return names[rarity] || rarity
}

export function CardCollection({ userId, className = '' }: CardCollectionProps) {
  const [cards, setCards] = useState<UserCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [updatingCardIds, setUpdatingCardIds] = useState<Record<string, boolean>>({})
  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    if (!img.src.includes(FALLBACK_IMAGE)) {
      img.src = FALLBACK_IMAGE
    }
  }
  const [selectedCard, setSelectedCard] = useState<UserCard | null>(null)

  // ī�� �κ��丮 ��ȸ
  const fetchInventory = useCallback(async () => {
    if (!userId) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        userId,
        page: '1',
        limit: '100', // ��ü ī�� ��������
        ...(filterType && { type: filterType }),
        ...(favoritesOnly && { favorites: 'true' })
      })

      const response = await fetch(`/api/cards/inventory?${params}`)
      const data = await response.json()

      if (data.success) {
        setCards(data.inventory)
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error)
    } finally {
      setIsLoading(false)
    }
  }, [userId, filterType, favoritesOnly])


  useEffect(() => {
    fetchInventory()
  }, [fetchInventory])

  useEffect(() => {
    const handleInventoryUpdate = () => fetchInventory()
    window.addEventListener('card-inventory-updated', handleInventoryUpdate)
    return () => window.removeEventListener('card-inventory-updated', handleInventoryUpdate)
  }, [fetchInventory])


  // 카드 상태 업데이트 (즐겨찾기, 잠금)
  const updateCardState = async (cardId: string, updates: { isFavorite?: boolean; isLocked?: boolean }) => {
    if (!userId || updatingCardIds[cardId]) return

    const previousCards = cards
    const previousSelectedCard = selectedCard

    setUpdatingCardIds((prev) => ({ ...prev, [cardId]: true }))
    setCards((prevCards) =>
      prevCards.map((card) => (card.cardId === cardId ? { ...card, ...updates } : card))
    )
    setSelectedCard((prevCard) =>
      prevCard && prevCard.cardId === cardId ? { ...prevCard, ...updates } : prevCard
    )

    try {
      const response = await fetch('/api/cards/inventory', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId,
          cardId,
          ...updates
        })
      })

      if (!response.ok) {
        throw new Error('카드 상태 업데이트 실패')
      }
    } catch (error) {
      console.error('Failed to update card state:', error)
      // 실패 시 바로 롤백해서 버벅임을 최소화합니다.
      setCards(previousCards)
      setSelectedCard(previousSelectedCard)
    } finally {
      setUpdatingCardIds((prev) => {
        const next = { ...prev }
        delete next[cardId]
        return next
      })
    }
  }

  // 검색 필터링
  const filteredCards = cards.filter(card => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        card.cardInfo.name.toLowerCase().includes(query) ||
        card.cardInfo.description.toLowerCase().includes(query) ||
        (card.cardInfo.member && card.cardInfo.member.toLowerCase().includes(query))
      )
    }
    return true
  })

  // 빈 슬롯 생성
  const createSlots = () => {
    const slots = []
    
    for (let i = 0; i < TOTAL_SLOTS; i++) {
      const card = filteredCards[i]
      slots.push(
        <motion.div
          key={i}
          className="aspect-[3/4] bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 hover:border-primary-300 transition-all duration-300 relative overflow-hidden cursor-pointer"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: i * 0.02 }}
          onClick={() => card && setSelectedCard(card)}
          whileHover={{ scale: card ? 1.05 : 1.02 }}
        >
          {card ? (
            <>
              {/* 등급 배경 */}
              <div className={`absolute inset-0 bg-gradient-to-br ${getRarityColor(card.cardInfo.rarity)} opacity-20`} />
              
              {/* 카드 이미지 */}
              <div className="relative h-full p-2 flex flex-col">
                <div className="flex-1 bg-white rounded-lg flex items-center justify-center overflow-hidden mb-2">
                  {card.cardInfo.imageUrl ? (
                    <img 
                      src={card.cardInfo.imageUrl} 
                      alt={card.cardInfo.name}
                      className="w-full h-full object-cover"
                      onError={handleImageError}
                    />
                  ) : (
                    <div className="text-xl">
                      {card.cardInfo.member ? 
                        {'재원': '👨‍💻', '민석': '🏔️', '진규': '🪖', '한울': '🎮', '승찬': '🌟', '희열': '🔮'}[card.cardInfo.member] || '👤'
                        : card.cardInfo.type === 'year' ? '📅'
                        : card.cardInfo.type === 'special' ? '⭐'
                        : card.cardInfo.type === 'signature' ? '✨'
                        : card.cardInfo.type === 'material' ? '🔧'
                        : card.cardInfo.type === 'prestige' ? '👑'
                        : '🎴'
                      }
                    </div>
                  )}
                  
                  {/* 수량 배지 */}
                  {card.quantity > 1 && (
                    <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
                      ×{card.quantity}
                    </div>
                  )}
                  
                  {/* 즐겨찾기/잠금 표시 */}
                  <div className="absolute bottom-1 left-1 flex space-x-1">
                    {card.isFavorite && (
                      <Heart className="w-3 h-3 text-pink-500" fill="currentColor" />
                    )}
                    {card.isLocked && (
                      <Lock className="w-3 h-3 text-orange-500" />
                    )}
                  </div>
                </div>

                {/* 카드 이름 */}
                <div className="text-center">
                  <h4 className="text-xs font-medium text-gray-800 truncate mb-1">
                    {card.cardInfo.name}
                  </h4>
                  <span className={`text-xs px-1 py-0.5 rounded bg-gradient-to-r ${getRarityColor(card.cardInfo.rarity)} text-white font-medium`}>
                    {getRarityName(card.cardInfo.rarity)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            /* 빈 슬롯 */
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <span className="text-xs">빈 슬롯</span>
              </div>
            </div>
          )}
        </motion.div>
      )
    }
    return slots
  }

  if (!userId) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">카드 컬렉션</h3>
          <p className="text-gray-500">로그인 후 카드 컬렉션을 확인하세요</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card variant="flat" className={`overflow-hidden shadow-2xl ${className}`}>
        {/* 헤더 */}
        <CardHeader className="border-b border-gray-200/80 bg-white/95 pb-4 text-gray-900">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">카드 컬렉션</h2>
                <p className="text-sm text-gray-500">소장중인 카드: {cards.length}/{TOTAL_SLOTS}</p>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>

          {/* 검색바 */}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="카드 이름이나 멤버로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 !border-gray-300 !bg-white !text-gray-900 placeholder:!text-gray-400"
              />
            </div>
          </div>

          {/* 필터 패널 */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                className="border-t border-gray-200 pt-4"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">타입</label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    >
                      <option value="">전체</option>
                      <option value="year">년도 카드</option>
                      <option value="special">스페셜 카드</option>
                      <option value="signature">시그니처 카드</option>
                      <option value="material">재료 카드</option>
                      <option value="prestige">프레스티지 카드</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">필터</label>
                    <button
                      onClick={() => setFavoritesOnly(!favoritesOnly)}
                      className={`w-full text-sm px-2 py-1 rounded-lg border ${
                        favoritesOnly 
                          ? 'bg-pink-50 border-pink-300 text-pink-700' 
                          : 'bg-white border-gray-300 text-gray-700'
                      }`}
                    >
                      ⭐ 즐겨찾기만
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardHeader>

        <CardContent className="bg-white/95">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p className="text-gray-500">카드를 불러오고 있습니다...</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
              {createSlots()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 카드 상세 모달 */}
      <AnimatePresence>
        {selectedCard && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedCard(null)}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
              initial={{ scale: 0.8, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* 모달 헤더 */}
              <div className={`bg-gradient-to-r ${getRarityColor(selectedCard.cardInfo.rarity)} p-4 text-white`}>
                <h3 className="font-semibold">{selectedCard.cardInfo.name}</h3>
                <p className="text-sm opacity-90">{selectedCard.cardInfo.description}</p>
              </div>

              {/* 모달 내용 */}
              <div className="p-6">
                <div className="text-center mb-4">
                  <div className="w-32 h-40 mx-auto mb-3 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                    {selectedCard.cardInfo.imageUrl ? (
                      <img 
                        src={selectedCard.cardInfo.imageUrl} 
                        alt={selectedCard.cardInfo.name}
                        className="w-full h-full object-cover"
                        onError={handleImageError}
                      />
                    ) : (
                      <div className="text-4xl">
                        {selectedCard.cardInfo.member ? 
                          {'재원': '👨‍💻', '민석': '🏔️', '진규': '🪖', '한울': '🎮', '승찬': '🌟', '희열': '🔮'}[selectedCard.cardInfo.member] || '👤'
                          : '🎴'
                        }
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-center space-x-4 mb-4">
                    <button
                      onClick={() => updateCardState(selectedCard.cardId, { isFavorite: !selectedCard.isFavorite })}
                      disabled={Boolean(updatingCardIds[selectedCard.cardId])}
                      className={`p-2 rounded-lg ${selectedCard.isFavorite ? 'text-pink-500 bg-pink-50' : 'text-gray-400 hover:text-pink-500 hover:bg-pink-50'}`}
                    >
                      <Heart className="w-5 h-5" fill={selectedCard.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => updateCardState(selectedCard.cardId, { isLocked: !selectedCard.isLocked })}
                      disabled={Boolean(updatingCardIds[selectedCard.cardId])}
                      className={`p-2 rounded-lg ${selectedCard.isLocked ? 'text-orange-500 bg-orange-50' : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'}`}
                    >
                      {selectedCard.isLocked ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <Button
                  variant="glass"
                  className="w-full"
                  onClick={() => setSelectedCard(null)}
                >
                  닫기
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
