'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Package, 
  Search, 
  Filter,
  Star,
  Lock,
  Unlock,
  Heart,
  Grid3X3,
  List,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  Gift
} from 'lucide-react'
import { Button } from './Button'
import { Card, CardContent, CardHeader } from './Card'
import { Input } from './Input'

interface CardInventoryProps {
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

export function CardInventory({ userId, className = '' }: CardInventoryProps) {
  const [cards, setCards] = useState<UserCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState('recent')
  const [filterType, setFilterType] = useState('')
  const [filterRarity, setFilterRarity] = useState('')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [showFilters, setShowFilters] = useState(false)

  // 카드 인벤토리 조회
  const fetchInventory = async (page: number = 1) => {
    if (!userId) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        userId,
        page: page.toString(),
        limit: '20',
        sortBy,
        ...(filterType && { type: filterType }),
        ...(filterRarity && { rarity: filterRarity }),
        ...(favoritesOnly && { favorites: 'true' })
      })

      const response = await fetch(`/api/cards/inventory?${params}`)
      const data = await response.json()

      if (data.success) {
        setCards(data.inventory)
        setTotalPages(data.pagination.totalPages)
        setCurrentPage(page)
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInventory(1)
  }, [userId, sortBy, filterType, filterRarity, favoritesOnly])

  // 카드 상태 업데이트 (즐겨찾기, 잠금)
  const updateCardState = async (cardId: string, updates: { isFavorite?: boolean; isLocked?: boolean }) => {
    if (!userId) return

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

      if (response.ok) {
        // 로컬 상태 업데이트
        setCards(prevCards => 
          prevCards.map(card => 
            card.cardId === cardId 
              ? { ...card, ...updates }
              : card
          )
        )
      }
    } catch (error) {
      console.error('Failed to update card state:', error)
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

  if (!userId) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">카드 보관함</h3>
          <p className="text-gray-500">로그인 후 카드 컬렉션을 확인하세요</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      {/* 헤더 */}
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">카드 보관함</h2>
              <p className="text-sm text-gray-500">소장중인 카드: {cards.length}장</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            >
              {viewMode === 'grid' ? <List className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* 검색바 */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="카드 이름이나 멤버로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* 정렬 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">정렬</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1"
                  >
                    <option value="recent">최근 획득순</option>
                    <option value="rarity">등급순</option>
                    <option value="name">이름순</option>
                  </select>
                </div>

                {/* 타입 필터 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">타입</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1"
                  >
                    <option value="">전체</option>
                    <option value="year">년도 카드</option>
                    <option value="special">스페셜 카드</option>
                    <option value="signature">시그니처 카드</option>
                    <option value="material">재료 카드</option>
                    <option value="prestige">프레스티지 카드</option>
                  </select>
                </div>

                {/* 등급 필터 */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">등급</label>
                  <select
                    value={filterRarity}
                    onChange={(e) => setFilterRarity(e.target.value)}
                    className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1"
                  >
                    <option value="">전체</option>
                    <option value="basic">베이직</option>
                    <option value="rare">레어</option>
                    <option value="epic">에픽</option>
                    <option value="legendary">레전더리</option>
                    <option value="material">재료</option>
                  </select>
                </div>

                {/* 즐겨찾기 필터 */}
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

      <CardContent>
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p className="text-gray-500">카드를 불러오고 있습니다...</p>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">카드가 없습니다</h3>
            <p className="text-gray-500">
              {searchQuery || filterType || filterRarity || favoritesOnly 
                ? '검색 조건에 맞는 카드가 없습니다' 
                : '카드 드랍으로 첫 번째 카드를 획득해보세요'}
            </p>
          </div>
        ) : (
          <>
            {/* 카드 그리드/리스트 */}
            <div className={
              viewMode === 'grid' 
                ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4'
                : 'space-y-3'
            }>
              <AnimatePresence>
                {filteredCards.map((userCard, index) => (
                  <motion.div
                    key={userCard._id}
                    className={`
                      ${viewMode === 'grid' ? 'aspect-[3/4]' : 'flex items-center space-x-4 p-3'}
                      bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300 relative overflow-hidden
                    `}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    {/* 등급 배경 */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${getRarityColor(userCard.cardInfo.rarity)} opacity-10`} />
                    
                    {viewMode === 'grid' ? (
                      <div className="relative h-full p-3 flex flex-col">
                        {/* 카드 이미지 */}
                        <div className="flex-1 mb-3 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {userCard.cardInfo.imageUrl ? (
                            <img 
                              src={userCard.cardInfo.imageUrl} 
                              alt={userCard.cardInfo.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-2xl">
                              {userCard.cardInfo.member ? 
                                {'재원': '👨‍💻', '민석': '🏔️', '진규': '🪖', '한울': '🎮', '승찬': '🌟', '희열': '🔮'}[userCard.cardInfo.member] || '👤'
                                : userCard.cardInfo.type === 'year' ? '📅'
                                : userCard.cardInfo.type === 'special' ? '⭐'
                                : userCard.cardInfo.type === 'signature' ? '✨'
                                : userCard.cardInfo.type === 'material' ? '🔧'
                                : userCard.cardInfo.type === 'prestige' ? '👑'
                                : '🎴'
                              }
                            </div>
                          )}
                          
                          {/* 수량 배지 */}
                          {userCard.quantity > 1 && (
                            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
                              ×{userCard.quantity}
                            </div>
                          )}
                        </div>

                        {/* 카드 정보 */}
                        <div className="space-y-1">
                          <h4 className="font-semibold text-sm text-gray-800 truncate">
                            {userCard.cardInfo.name}
                          </h4>
                          <div className="flex items-center justify-between">
                            <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${getRarityColor(userCard.cardInfo.rarity)} text-white font-medium`}>
                              {getRarityName(userCard.cardInfo.rarity)}
                            </span>
                            <div className="flex items-center space-x-1">
                              <button
                                onClick={() => updateCardState(userCard.cardId, { isFavorite: !userCard.isFavorite })}
                                className={`p-1 rounded ${userCard.isFavorite ? 'text-pink-500' : 'text-gray-400 hover:text-pink-500'}`}
                              >
                                <Heart className="w-3 h-3" fill={userCard.isFavorite ? 'currentColor' : 'none'} />
                              </button>
                              <button
                                onClick={() => updateCardState(userCard.cardId, { isLocked: !userCard.isLocked })}
                                className={`p-1 rounded ${userCard.isLocked ? 'text-orange-500' : 'text-gray-400 hover:text-orange-500'}`}
                              >
                                {userCard.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-4 w-full">
                        {/* 카드 이미지 (리스트 모드) */}
                        <div className="w-16 h-20 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                          {userCard.cardInfo.imageUrl ? (
                            <img 
                              src={userCard.cardInfo.imageUrl} 
                              alt={userCard.cardInfo.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-lg">
                              {userCard.cardInfo.member ? 
                                {'재원': '👨‍💻', '민석': '🏔️', '진규': '🪖', '한울': '🎮', '승찬': '🌟', '희열': '🔮'}[userCard.cardInfo.member] || '👤'
                                : '🎴'
                              }
                            </div>
                          )}
                          
                          {userCard.quantity > 1 && (
                            <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
                              ×{userCard.quantity}
                            </div>
                          )}
                        </div>

                        {/* 카드 정보 (리스트 모드) */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-800 truncate mb-1">
                            {userCard.cardInfo.name}
                          </h4>
                          <p className="text-sm text-gray-600 truncate mb-2">
                            {userCard.cardInfo.description}
                          </p>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs px-2 py-1 rounded-full bg-gradient-to-r ${getRarityColor(userCard.cardInfo.rarity)} text-white`}>
                              {getRarityName(userCard.cardInfo.rarity)}
                            </span>
                            {userCard.cardInfo.year && (
                              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700">
                                {userCard.cardInfo.year}년 {userCard.cardInfo.period === 'h1' ? '상반기' : '하반기'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 액션 버튼 (리스트 모드) */}
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateCardState(userCard.cardId, { isFavorite: !userCard.isFavorite })}
                            className={`p-2 rounded-lg ${userCard.isFavorite ? 'text-pink-500 bg-pink-50' : 'text-gray-400 hover:text-pink-500 hover:bg-pink-50'}`}
                          >
                            <Heart className="w-4 h-4" fill={userCard.isFavorite ? 'currentColor' : 'none'} />
                          </button>
                          <button
                            onClick={() => updateCardState(userCard.cardId, { isLocked: !userCard.isLocked })}
                            className={`p-2 rounded-lg ${userCard.isLocked ? 'text-orange-500 bg-orange-50' : 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'}`}
                          >
                            {userCard.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center space-x-2 mt-8">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchInventory(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i
                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => fetchInventory(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchInventory(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </div>
  )
}
