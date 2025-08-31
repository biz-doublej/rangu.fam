'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Shuffle, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { CardFlipReveal } from '@/components/ui/CardFlipReveal'

// Sample cards for demo
const sampleCards = [
  {
    cardId: 'jaewon_2024_h1',
    name: '재원 2024년 상반기',
    type: 'year',
    rarity: 'basic',
    description: '코딩과 함께하는 즐거운 나날들',
    imageUrl: '',
    member: '재원',
    year: 2024,
    period: 'h1'
  },
  {
    cardId: 'minseok_special_mountain',
    name: '민석의 등반 도전',
    type: 'special',
    rarity: 'rare',
    description: '새로운 정상을 향한 끝없는 도전',
    imageUrl: '',
    member: '민석',
  },
  {
    cardId: 'jinkyu_signature_military',
    name: '진규의 군인 정신',
    type: 'signature',
    rarity: 'epic',
    description: '강인한 정신력과 책임감의 상징',
    imageUrl: '',
    member: '진규',
  },
  {
    cardId: 'hanul_gaming_legend',
    name: '한울의 게임 마스터',
    type: 'signature',
    rarity: 'legendary',
    description: '게임 세계의 진정한 마스터',
    imageUrl: '',
    member: '한울',
  },
  {
    cardId: 'seungchan_star_power',
    name: '승찬의 스타 파워',
    type: 'special',
    rarity: 'epic',
    description: '무대 위의 빛나는 별',
    imageUrl: '',
    member: '승찬',
  },
  {
    cardId: 'heeyeol_mystic_crystal',
    name: '희열의 신비한 수정구',
    type: 'material',
    rarity: 'material',
    description: '마법 같은 순간들을 만드는 힘',
    imageUrl: '',
    member: '희열',
  }
]

export default function CardFlipDemoPage() {
  const router = useRouter()
  const [currentCardIndex, setCurrentCardIndex] = useState(0)
  const [isRevealed, setIsRevealed] = useState(false)
  const [revealKey, setRevealKey] = useState(0)

  const currentCard = sampleCards[currentCardIndex]

  const handleNextCard = () => {
    setCurrentCardIndex((prev) => (prev + 1) % sampleCards.length)
    setIsRevealed(false)
    setRevealKey(prev => prev + 1)
  }

  const handleReveal = () => {
    setIsRevealed(true)
  }

  const handleReset = () => {
    setIsRevealed(false)
    setRevealKey(prev => prev + 1)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      {/* Header */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          <motion.div
            className="flex items-center space-x-4"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>뒤로가기</span>
            </Button>
          </motion.div>

          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              🎴 카드 플립 애니메이션 데모
            </h1>
            <p className="text-sm text-gray-600">
              다양한 카드 타입의 플립 애니메이션을 체험해보세요
            </p>
          </motion.div>

          <div className="w-20"></div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Card Demo Area */}
            <div className="lg:col-span-2 flex flex-col items-center justify-center">
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <CardFlipReveal
                  key={revealKey}
                  card={currentCard}
                  isRevealed={isRevealed}
                  onRevealComplete={() => console.log('Reveal complete!')}
                />
              </motion.div>

              {/* Controls */}
              <motion.div
                className="flex space-x-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                {!isRevealed ? (
                  <Button
                    variant="glass"
                    onClick={handleReveal}
                    className="px-6 py-3"
                  >
                    카드 공개하기
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    onClick={handleReset}
                    className="px-6 py-3 flex items-center space-x-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>다시 뒤집기</span>
                  </Button>
                )}
                
                <Button
                  variant="secondary"
                  onClick={handleNextCard}
                  className="px-6 py-3 flex items-center space-x-2"
                >
                  <Shuffle className="w-4 h-4" />
                  <span>다른 카드</span>
                </Button>
              </motion.div>
            </div>

            {/* Info Panel */}
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-gray-800">
                      현재 카드 정보
                    </h3>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">이름:</span>
                        <span className="text-sm font-medium">{currentCard.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">타입:</span>
                        <span className="text-sm font-medium">
                          {currentCard.type === 'year' ? '년도' :
                           currentCard.type === 'special' ? '스페셜' :
                           currentCard.type === 'signature' ? '시그니처' :
                           currentCard.type === 'material' ? '재료' : currentCard.type}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">등급:</span>
                        <span className={`text-sm font-medium ${
                          currentCard.rarity === 'basic' ? 'text-gray-600' :
                          currentCard.rarity === 'rare' ? 'text-blue-600' :
                          currentCard.rarity === 'epic' ? 'text-pink-600' :
                          currentCard.rarity === 'legendary' ? 'text-yellow-600' :
                          currentCard.rarity === 'material' ? 'text-green-600' : 'text-gray-600'
                        }`}>
                          {currentCard.rarity === 'basic' ? '베이직' :
                           currentCard.rarity === 'rare' ? '레어' :
                           currentCard.rarity === 'epic' ? '에픽' :
                           currentCard.rarity === 'legendary' ? '레전더리' :
                           currentCard.rarity === 'material' ? '재료' : currentCard.rarity}
                        </span>
                      </div>
                      {currentCard.member && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">멤버:</span>
                          <span className="text-sm font-medium">{currentCard.member}</span>
                        </div>
                      )}
                    </div>
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        {currentCard.description}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-gray-800">
                      애니메이션 가이드
                    </h3>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                        <span><strong>베이직:</strong> 0.6초 기본 애니메이션</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                        <span><strong>레어:</strong> 0.8초 + 파티클 효과</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-pink-400 rounded-full"></div>
                        <span><strong>에픽:</strong> 1.0초 + 홀로그램 효과</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        <span><strong>레전더리:</strong> 1.2초 + 링 효과</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        <span><strong>재료:</strong> 0.7초 특수 효과</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
              >
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-gray-800">
                      카드 목록
                    </h3>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {sampleCards.map((card, index) => (
                        <button
                          key={card.cardId}
                          onClick={() => {
                            setCurrentCardIndex(index)
                            setIsRevealed(false)
                            setRevealKey(prev => prev + 1)
                          }}
                          className={`
                            w-full text-left p-2 rounded-md text-xs transition-colors
                            ${index === currentCardIndex 
                              ? 'bg-purple-100 text-purple-700' 
                              : 'hover:bg-gray-100'
                            }
                          `}
                        >
                          <div className="font-medium">{card.name}</div>
                          <div className="text-gray-500">
                            {card.rarity} • {card.member}
                          </div>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}