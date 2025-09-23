'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Package, 
  Sparkles, 
  Star,
  Zap,
  Gift,
  Crown
} from 'lucide-react'
import { getMemberEmoji } from '@/lib/memberUtils'

interface CardFlipRevealProps {
  card: {
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
  isRevealed: boolean
  onRevealComplete?: () => void
  autoReveal?: boolean
  revealDelay?: number
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

const getRarityGlow = (rarity: string) => {
  switch (rarity) {
    case 'basic':
      return 'shadow-gray-500/20'
    case 'rare':
      return 'shadow-blue-500/40'
    case 'epic':
      return 'shadow-pink-500/40'
    case 'legendary':
      return 'shadow-yellow-500/50'
    case 'material':
      return 'shadow-green-500/40'
    default:
      return 'shadow-gray-500/20'
  }
}

const getAnimationDuration = (rarity: string) => {
  switch (rarity) {
    case 'basic':
      return 1.5
    case 'rare':
      return 2.0
    case 'epic':
      return 2.5
    case 'legendary':
      return 3.5
    case 'material':
      return 2.0
    default:
      return 1.5
  }
}

// 카드 타입과 레어리티에 따른 BG 이미지 URL 생성
const getCardBgImageUrl = (card: any) => {
  console.log('🔍 getCardBgImageUrl called with card:', {
    cardId: card.cardId,
    name: card.name,
    type: card.type,
    rarity: card.rarity
  })
  
  let bgImageUrl = ''
  
  if (card.type === 'special' || card.type === 'SPECIAL') {
    bgImageUrl = '/images/cards/special/BG_SPECIAL.jpg'
    console.log('🎯 Special card detected, using BG_SPECIAL.jpg')
  } else if (card.type === 'signature' || card.type === 'SIGNATURE') {
    bgImageUrl = '/images/cards/signature/BG_SIGNATURE.jpg'
    console.log('🎯 Signature card detected, using BG_SIGNATURE.jpg')
  } else if (card.type === 'prestige' || card.type === 'PRESTIGE') {
    // prestige의 경우 멤버별 BG 파일 확인
    const member = card.member || ''
    if (member.includes('한울')) {
      bgImageUrl = '/images/cards/prestige/BG_HAN_PRE.jpg'
    } else if (member.includes('재원')) {
      bgImageUrl = '/images/cards/prestige/BG_JAE_PRE.jpg'
    } else if (member.includes('진규')) {
      bgImageUrl = '/images/cards/prestige/BG_JIN_PRE.jpg'
    } else if (member.includes('승찬')) {
      bgImageUrl = '/images/cards/prestige/BG_LEE_PRE.jpg'
    } else if (member.includes('민석')) {
      bgImageUrl = '/images/cards/prestige/BG_MIN_PRE.jpg'
    } else {
      bgImageUrl = '/images/cards/prestige/PGBG.jpg'
    }
    console.log('🎯 Prestige BG selected for', member, ':', bgImageUrl)
  } else if (card.type === 'material' || card.type === 'MATERIAL') {
    // Material 카드는 조커카드 BG 사용
    bgImageUrl = '/images/cards/material/BG_JOKER_CARD.jpg'
    console.log('🎯 Material card, using BG_JOKER_CARD.jpg')
  } else if (card.type === 'year' || card.type === 'YEAR') {
    // Year 카드는 연도별 공통 BG 사용
    bgImageUrl = `/images/cards/year/BG_${card.year || 2024}.jpg`
    console.log('🎯 Year card, using year BG:', bgImageUrl)
  } else {
    // 기본 BG 이미지
    bgImageUrl = '/images/cards/default.jpg'
    console.log('🎯 Other card type, using default BG')
  }
  
  console.log('✅ Final BG URL:', bgImageUrl)
  return bgImageUrl
}

// 실제 뽑힌 카드의 이미지 URL (원본 그대로)
const getActualCardImageUrl = (card: any) => {
  console.log('🔍 getActualCardImageUrl called with card:', {
    cardId: card.cardId,
    name: card.name,
    type: card.type,
    rarity: card.rarity,
    imageUrl: card.imageUrl,
    member: card.member
  })
  
  let imageUrl = ''
  
  // 시그니처 카드의 경우 특별 처리 - 패턴으로 생성
  if (card.type === 'signature' || card.type === 'SIGNATURE') {
    if (card.cardImageUrl) {
      console.log('🎯 Using cardImageUrl for signature card:', card.cardImageUrl)
      imageUrl = card.cardImageUrl
    } else {
      // cardImageUrl이 없으면 패턴으로 생성 (실제 파일 존재하는 것만)
      const memberAbbrev = card.member?.includes('한울') ? 'HAN' 
                          : card.member?.includes('재원') ? 'JAE'
                          : card.member?.includes('진규') ? 'JIN'
                          : card.member?.includes('승찬') ? 'LEE'
                          : card.member?.includes('민석') ? 'MIN'
                          : 'HAN'
      
      // 실제 존재하는 파일 매핑
      const availableFiles: Record<string, string[]> = {
        'HAN': ['20', '22', '23'],
        'JAE': ['22', '24', '25'],
        'JIN': [],
        'LEE': [],
        'MIN': []
      }
      
      const memberFiles = availableFiles[memberAbbrev] || []
      if (memberFiles.length > 0) {
        // 첫 번째 사용 가능한 파일 사용
        const year = memberFiles[0]
        imageUrl = `/images/cards/signature/SIG_${memberAbbrev}_${year}.jpg`
        console.log('🎯 Generated signature image URL:', imageUrl)
      } else {
        // 사용 가능한 파일이 없으면 기본 시그니처 배경 사용
        imageUrl = '/images/cards/signature/BG_SIGNATURE.jpg'
        console.log('🎯 Using fallback signature BG:', imageUrl)
      }
    }
  } else if (card.type === 'special' || card.type === 'SPECIAL') {
    // 스페셜 카드는 개별적으로 지정
    console.log('🎯 Special card - using individual mapping')
    
    // 스페셜 카드 개별 매핑 (실제 존재하는 파일만)
    const specialCardImageMap: Record<string, string> = {
      // LG 트윈스 카드 (실제 존재하는 파일만)
      'LGTWINS_JAE': '/images/cards/special/LGTWINS_JAE.jpg',
      'LGTWINS_LEE': '/images/cards/special/LGTWINS_LEE.jpg',
      'LGTWINS_MIN': '/images/cards/special/LGTWINS_MIN.jpg',
      
      // KIA 타이거즈 카드 (실제 존재하는 파일만)
      'KIATIGERS_HAN': '/images/cards/special/KIATIGERS_HAN.jpg',
      
      // 백넘버 카드 (실제 존재하는 파일만)
      'BACKNUM_JAE': '/images/cards/special/BACKNUM_JAE.jpg',
      'BACKNUM_HAN': '/images/cards/special/BACKNUM_HAN.jpg',
      'BACKNUM_LEE': '/images/cards/special/BACKNUM_LEE.jpg',
      'BACKNUM_MIN': '/images/cards/special/BACKNUM_MIN.jpg',
      'BACKNUM_JIN': '/images/cards/special/BACKNUM_JIN.jpg',
      
      // SC 연도별 카드 (실제 존재하는 파일만)
      'SC_HAN_2019': '/images/cards/special/SC_HAN_19.jpg',
      'SC_HAN_19': '/images/cards/special/SC_HAN_19.jpg',
      'SC_HAN_2020': '/images/cards/special/SC_HAN_20.jpg',
      'SC_HAN_20': '/images/cards/special/SC_HAN_20.jpg',
      'SC_HAN_2021': '/images/cards/special/SC_HAN_21.jpg',
      'SC_HAN_21': '/images/cards/special/SC_HAN_21.jpg',
      'SC_HAN_2022': '/images/cards/special/SC_HAN_22.jpg',
      'SC_HAN_22': '/images/cards/special/SC_HAN_22.jpg',
      'SC_HAN_2023': '/images/cards/special/SC_HAN_23.jpg',
      'SC_HAN_23': '/images/cards/special/SC_HAN_23.jpg',
      
      'SC_JAE_2022': '/images/cards/special/SC_JAE_22.jpg',
      'SC_JAE_22': '/images/cards/special/SC_JAE_22.jpg',
      'SC_JAE_2023': '/images/cards/special/SC_JAE_23.jpg',
      'SC_JAE_23': '/images/cards/special/SC_JAE_23.jpg',
      
      'SC_JIN_2019': '/images/cards/special/SC_JIN_19.jpg',
      'SC_JIN_19': '/images/cards/special/SC_JIN_19.jpg',
      'SC_JIN_2020': '/images/cards/special/SC_JIN_20.jpg',
      'SC_JIN_20': '/images/cards/special/SC_JIN_20.jpg',
      
      'SC_MIN_2022': '/images/cards/special/SC_MIN_22.jpg',
      'SC_MIN_22': '/images/cards/special/SC_MIN_22.jpg',
      
      // 랑구 기념 카드
      'RANGGU_ANNIVER': '/images/cards/special/RANGGU_ANNIVER.jpg',
      'RANGGU_SPECIAL': '/images/cards/special/RANGGU_SPECIAL.jpg'
    }
    
    if (specialCardImageMap[card.cardId]) {
      imageUrl = specialCardImageMap[card.cardId]
      console.log('🎯 Special card mapped:', card.cardId, '->', imageUrl)
    } else {
      // 매핑에 없는 경우 원본 imageUrl 사용
      imageUrl = card.imageUrl || '/images/cards/default.jpg'
      console.log('⚠️ Special card not in mapping, using original:', imageUrl)
    }
  } else if (card.type === 'year' || card.type === 'YEAR') {
    // 연도 카드도 개별적으로 지정
    console.log('🎯 Year card - using individual mapping')
    
    // 연도 카드 개별 매핑 (실제 존재하는 파일만 - 샘플로 일부만)
    const yearCardImageMap: Record<string, string> = {
      // 한울 연도 카드
      'HAN_21_v1': '/images/cards/year/HAN_21_V1.jpg',
      'HAN_21_v2': '/images/cards/year/HAN_21_V2.jpg',
      'HAN_22_v1': '/images/cards/year/HAN_22_V1.jpg',
      'HAN_22_v2': '/images/cards/year/HAN_22_V2.jpg',
      'HAN_23_v1': '/images/cards/year/HAN_23_V1.jpg',
      // 추가 매핑 필요 시 여기에 계속 추가...
    }
    
    if (yearCardImageMap[card.cardId]) {
      imageUrl = yearCardImageMap[card.cardId]
      console.log('🎯 Year card mapped:', card.cardId, '->', imageUrl)
    } else {
      // 매핑에 없는 경우 원본 imageUrl 사용
      imageUrl = card.imageUrl || '/images/cards/default.jpg'
      console.log('⚠️ Year card not in mapping, using original:', imageUrl)
    }
  } else if (card.type === 'material' || card.type === 'MATERIAL') {
    // 재료 카드는 cardImageUrl 사용 (JOKER_CARD.jpg)
    console.log('🎯 Material card - using cardImageUrl or imageUrl')
    imageUrl = card.cardImageUrl || card.imageUrl || '/images/cards/material/JOKER_CARD.jpg'
    console.log('🎯 Material card image:', imageUrl)
  } else if (card.type === 'prestige' || card.type === 'PRESTIGE') {
    // 프레스티지 카드도 cardImageUrl 우선 사용
    console.log('🎯 Prestige card - using cardImageUrl or imageUrl')
    imageUrl = card.cardImageUrl || card.imageUrl || '/images/cards/default.jpg'
    console.log('🎯 Prestige card image:', imageUrl)
  } else if (card.imageUrl) {
    imageUrl = card.imageUrl
  } else {
    imageUrl = '/images/cards/default.jpg'
  }
  
  console.log('🔍 Final image URL for card:', card.name, '->', imageUrl)
  return imageUrl
}

export function CardFlipReveal({ 
  card, 
  isRevealed, 
  onRevealComplete,
  autoReveal = false,
  revealDelay = 1000
}: CardFlipRevealProps) {
  const [isFlipped, setIsFlipped] = useState(false)
  const [showEffects, setShowEffects] = useState(false)
  const [clickToReveal, setClickToReveal] = useState(!autoReveal)

  const IconComponent = getRarityIcon(card.rarity)
  const duration = getAnimationDuration(card.rarity)

  useEffect(() => {
    console.log('CardFlipReveal useEffect:', { isRevealed, isFlipped, autoReveal, revealDelay })
    if (isRevealed && !isFlipped) {
      if (autoReveal) {
        console.log('Auto-revealing card after', revealDelay, 'ms')
        const timer = setTimeout(() => {
          console.log('Executing handleReveal now')
          handleReveal()
        }, revealDelay)
        return () => clearTimeout(timer)
      }
    }
  }, [isRevealed, isFlipped, autoReveal, revealDelay])

  const handleReveal = () => {
    if (isFlipped) return
    
    console.log('🎯 handleReveal called - flipping card')
    setIsFlipped(true)
    setShowEffects(true)
    setClickToReveal(false)

    // Hide effects after animation - extended for more dramatic effect
    setTimeout(() => {
      console.log('🎯 Animation completed, hiding effects')
      setShowEffects(false)
      onRevealComplete?.()
    }, duration * 1000 + 2000) // 2초 추가 연장
  }

  const cardVariants = {
    hidden: { 
      scale: 1,
      opacity: 1
    },
    flipped: { 
      scale: [1, 1.2, 1], // 간단한 스케일 애니메이션만
      opacity: [1, 0.8, 1],
      transition: { 
        duration: duration * 0.8, // 더 짧게
        ease: [0.42, 0, 0.58, 1]
      }
    }
  }

  const backVariants = {
    visible: { 
      opacity: 1,
    },
    hidden: { 
      opacity: 0,
      transition: { duration: duration / 2 }
    }
  }

  const frontVariants = {
    hidden: { 
      opacity: 0,
      scale: 0.5
    },
    visible: { 
      opacity: 1,
      scale: [0.5, 1.2, 1], // 간단한 팝 애니메이션
      transition: { 
        delay: duration * 0.3, // 더 빨리 나타남
        duration: duration * 0.5,
        ease: [0.42, 0, 0.58, 1]
      }
    }
  }

  const particleVariants = {
    hidden: { 
      scale: 0,
      opacity: 0,
    },
    visible: { 
      scale: [0, 1.2, 0],
      opacity: [0, 1, 0],
      transition: {
        duration: 1.5,
        ease: "easeOut",
        times: [0, 0.3, 1]
      }
    }
  }

  return (
    <div className="relative w-80 h-[411px] perspective-1000" style={{ minWidth: '320px', minHeight: '411px' }}>
      {/* Rarity-based Special Effects */}
      <AnimatePresence>
        {showEffects && (
          <>
            {/* Basic Rarity - 화산 폭발 이펙트 */}
            {card.rarity === 'basic' && (
              <>
                {/* 화면 진동 */}
                <motion.div
                  className="absolute inset-0"
                  animate={{ 
                    x: [0, -3, 3, -3, 3, 0],
                    y: [0, 3, -3, 3, -3, 0]
                  }}
                  transition={{ duration: 0.8, repeat: 3 }}
                />
                
                {/* 바닥에서 올라오는 용암 기둥들 */}
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={`lava-${i}`}
                    className="absolute w-4 h-80 bg-gradient-to-t from-orange-500 via-red-500 to-yellow-400 rounded-full shadow-2xl"
                    style={{
                      left: `${10 + (i * 7)}%`,
                      bottom: '-200px',
                    }}
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ 
                      scaleY: [0, 1.5, 1, 0],
                      opacity: [0, 1, 0.8, 0],
                      filter: ["brightness(1)", "brightness(2)", "brightness(1.5)", "brightness(0)"]
                    }}
                    transition={{
                      duration: 2.5,
                      delay: i * 0.1,
                      ease: "easeOut"
                    }}
                  />
                ))}
                
                {/* 폭발하는 마그마 입자들 */}
                {[...Array(40)].map((_, i) => (
                  <motion.div
                    key={`magma-${i}`}
                    className="absolute w-2 h-2 bg-gradient-to-br from-orange-400 to-red-600 rounded-full shadow-lg"
                    style={{
                      left: '50%',
                      bottom: '20%',
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: [0, 2, 1, 0],
                      opacity: [0, 1, 0.7, 0],
                      x: Math.cos(i * 9 * Math.PI / 180) * (80 + Math.random() * 120),
                      y: Math.sin(i * 9 * Math.PI / 180) * (80 + Math.random() * 120),
                      filter: ["brightness(1)", "brightness(3)", "brightness(1)"]
                    }}
                    transition={{
                      duration: 2,
                      delay: 0.5 + i * 0.02,
                      ease: "easeOut"
                    }}
                  />
                ))}
                
                {/* 연기 구름 */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={`smoke-${i}`}
                    className="absolute w-20 h-20 bg-gray-600 rounded-full opacity-40 blur-md"
                    style={{
                      left: `${Math.random() * 80 + 10}%`,
                      bottom: '0%',
                    }}
                    initial={{ scale: 0, y: 0 }}
                    animate={{ 
                      scale: [0, 1.5, 2],
                      y: [-50, -150, -250],
                      opacity: [0, 0.6, 0]
                    }}
                    transition={{
                      duration: 3,
                      delay: 1 + i * 0.2,
                      ease: "easeOut"
                    }}
                  />
                ))}
                
                {/* 충격파 */}
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={`shockwave-${i}`}
                    className="absolute inset-0 rounded-2xl border-4 border-orange-400"
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ 
                      scale: [0, 4 + i],
                      opacity: [1, 0]
                    }}
                    transition={{ duration: 2, delay: i * 0.3 }}
                  />
                ))}
              </>
            )}

            {/* Rare Rarity - 북극 빙하 폭풍 이펙트 */}
            {card.rarity === 'rare' && (
              <>
                {/* 얼음 배경 */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-b from-cyan-900/40 via-blue-900/30 to-transparent rounded-2xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.8, 0.5] }}
                  transition={{ duration: 3, repeat: 1 }}
                />
                
                {/* 하늘에서 떨어지는 거대 고드름 */}
                {[...Array(15)].map((_, i) => (
                  <motion.div
                    key={`icicle-${i}`}
                    className="absolute w-3 h-32 bg-gradient-to-b from-white via-cyan-200 to-blue-400 shadow-2xl"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: '-150px',
                      clipPath: 'polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%)'
                    }}
                    initial={{ y: -200, opacity: 0, scale: 0 }}
                    animate={{ 
                      y: [0, 500],
                      opacity: [0, 1, 0.8, 0],
                      scale: [0, 1.2, 1],
                      filter: ["brightness(1)", "brightness(2)", "brightness(1)"]
                    }}
                    transition={{
                      duration: 2.5,
                      delay: i * 0.1,
                      ease: "easeIn"
                    }}
                  />
                ))}
                
                {/* 얼음 폭발 파편 */}
                {[...Array(50)].map((_, i) => (
                  <motion.div
                    key={`ice-shard-${i}`}
                    className="absolute w-2 h-6 bg-gradient-to-b from-white to-cyan-400 shadow-lg"
                    style={{
                      left: '50%',
                      top: '50%',
                      clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: [0, 1.5, 0.8, 0],
                      opacity: [0, 1, 0.7, 0],
                      x: Math.cos(i * 7.2 * Math.PI / 180) * (100 + Math.random() * 150),
                      y: Math.sin(i * 7.2 * Math.PI / 180) * (100 + Math.random() * 150),
                      rotate: Math.random() * 720,
                      filter: ["brightness(1)", "brightness(3)", "brightness(1)"]
                    }}
                    transition={{
                      duration: 2.2,
                      delay: 0.8 + i * 0.02,
                      ease: "easeOut"
                    }}
                  />
                ))}
                
                {/* 눈보라 */}
                {[...Array(100)].map((_, i) => (
                  <motion.div
                    key={`snowflake-${i}`}
                    className="absolute w-1 h-1 bg-white rounded-full opacity-80"
                    style={{
                      left: `${Math.random() * 120 - 10}%`,
                      top: `-20px`,
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ 
                      opacity: [0, 1, 0],
                      y: 500,
                      x: Math.sin(i) * 100,
                      scale: [0.5, 1, 0.5]
                    }}
                    transition={{
                      duration: 4,
                      delay: i * 0.01,
                      ease: "linear"
                    }}
                  />
                ))}
                
                {/* 얼음 결정 링 */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={`ice-ring-${i}`}
                    className="absolute inset-0 rounded-2xl border-2 border-cyan-300"
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ 
                      scale: [0, 2.5 + i * 0.5],
                      opacity: [1, 0],
                      filter: ["brightness(1)", "brightness(2)", "brightness(1)"]
                    }}
                    transition={{ duration: 2.5, delay: i * 0.3 }}
                  />
                ))}
                
                {/* 서리 결정 */}
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={`frost-${i}`}
                    className="absolute w-4 h-4 border-2 border-white opacity-60"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                      clipPath: 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                    }}
                    initial={{ scale: 0, opacity: 0, rotate: 0 }}
                    animate={{ 
                      scale: [0, 1.5, 1],
                      opacity: [0, 0.8, 0.4],
                      rotate: 360
                    }}
                    transition={{
                      duration: 2,
                      delay: 1.5 + i * 0.1,
                      ease: "easeOut"
                    }}
                  />
                ))}
              </>
            )}

            {/* Epic Rarity - 드래곤 소환 이펙트 */}
            {card.rarity === 'epic' && (
              <>
                {/* 마법진 배경 */}
                <motion.div
                  className="absolute inset-0 bg-gradient-radial from-purple-900/50 via-pink-900/40 to-transparent rounded-2xl"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ 
                    scale: [0, 1.5, 1],
                    opacity: [0, 0.8, 0.5]
                  }}
                  transition={{ duration: 4 }}
                />
                
                {/* 회전하는 마법진 */}
                {[...Array(3)].map((_, ringIndex) => (
                  <motion.div
                    key={`magic-circle-${ringIndex}`}
                    className="absolute inset-0 rounded-full border-2 border-pink-400"
                    style={{
                      width: `${(ringIndex + 1) * 120}px`,
                      height: `${(ringIndex + 1) * 120}px`,
                      left: '50%',
                      top: '50%',
                      marginLeft: `-${(ringIndex + 1) * 60}px`,
                      marginTop: `-${(ringIndex + 1) * 60}px`,
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ 
                      opacity: [0, 1, 0.7],
                      scale: [0, 1.2, 1],
                      rotate: ringIndex % 2 === 0 ? 360 : -360
                    }}
                    transition={{ 
                      duration: 4, 
                      delay: ringIndex * 0.3,
                      rotate: { duration: 8, repeat: Infinity, ease: "linear" }
                    }}
                  />
                ))}
                
                {/* 드래곤 불꽃 */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={`dragon-fire-${i}`}
                    className="absolute w-12 h-40 bg-gradient-to-t from-red-600 via-orange-400 to-yellow-300 rounded-full shadow-2xl"
                    style={{
                      left: '50%',
                      top: '50%',
                      marginLeft: '-24px',
                      marginTop: '-200px',
                      transformOrigin: 'bottom center',
                      rotate: `${i * 45}deg`
                    }}
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ 
                      scaleY: [0, 1.5, 1, 0],
                      opacity: [0, 1, 0.8, 0],
                      filter: ["brightness(1)", "brightness(3)", "brightness(2)", "brightness(1)"]
                    }}
                    transition={{
                      duration: 3,
                      delay: 1 + i * 0.2,
                      ease: "easeOut"
                    }}
                  />
                ))}
                
                {/* 마법 입자 폭발 */}
                {[...Array(80)].map((_, i) => (
                  <motion.div
                    key={`magic-particle-${i}`}
                    className="absolute w-3 h-3 bg-gradient-to-r from-pink-400 via-purple-500 to-blue-600 rounded-full shadow-lg"
                    style={{
                      left: '50%',
                      top: '50%',
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: [0, 2.5, 1.5, 0],
                      opacity: [0, 1, 0.8, 0],
                      x: Math.cos(i * 4.5 * Math.PI / 180) * (120 + Math.random() * 180),
                      y: Math.sin(i * 4.5 * Math.PI / 180) * (120 + Math.random() * 180),
                      filter: ["brightness(1)", "brightness(4)", "brightness(2)", "brightness(1)"]
                    }}
                    transition={{
                      duration: 3.5,
                      delay: 1.5 + i * 0.01,
                      ease: "easeOut"
                    }}
                  />
                ))}
                
                {/* 번개 마법 */}
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={`lightning-magic-${i}`}
                    className="absolute w-1 h-60 bg-gradient-to-t from-purple-600 via-pink-400 to-white shadow-2xl"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: '-100px',
                    }}
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ 
                      scaleY: [0, 1, 0],
                      opacity: [0, 1, 0],
                      filter: ["brightness(1)", "brightness(5)", "brightness(1)"]
                    }}
                    transition={{
                      duration: 0.5,
                      delay: 2 + i * 0.1,
                      ease: "easeOut"
                    }}
                  />
                ))}
                
                {/* 소환 룬 문자 */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={`rune-${i}`}
                    className="absolute w-8 h-8 border-2 border-pink-400 opacity-70"
                    style={{
                      left: `${20 + i * 12}%`,
                      top: `${30 + (i % 2) * 40}%`,
                      clipPath: 'polygon(50% 0%, 80% 10%, 100% 35%, 85% 60%, 60% 80%, 40% 80%, 15% 60%, 0% 35%, 20% 10%)'
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: [0, 1.5, 1],
                      opacity: [0, 1, 0.7],
                      filter: ["brightness(1)", "brightness(3)", "brightness(2)"]
                    }}
                    transition={{
                      duration: 2,
                      delay: 0.5 + i * 0.3,
                      ease: "easeOut"
                    }}
                  />
                ))}
                
                {/* 확장하는 마법 오라 */}
                {[...Array(7)].map((_, i) => (
                  <motion.div
                    key={`aura-${i}`}
                    className="absolute inset-0 rounded-2xl border-2 border-purple-400/60"
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ 
                      scale: [0, 3.5 + i * 0.5],
                      opacity: [1, 0]
                    }}
                    transition={{ duration: 4, delay: i * 0.4 }}
                  />
                ))}
              </>
            )}

            {/* Legendary Rarity - 우주 창조 이펙트 */}
            {card.rarity === 'legendary' && (
              <>
                {/* 빅뱅 시작 */}
                <motion.div
                  className="absolute inset-0 bg-gradient-radial from-white via-yellow-200/80 to-transparent rounded-2xl"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0.8, 0.3],
                    scale: [0, 0.1, 3, 5]
                  }}
                  transition={{ duration: 5 }}
                />
                
                {/* 창조의 빛줄기 (모든 방향) */}
                {[...Array(24)].map((_, i) => (
                  <motion.div
                    key={`creation-ray-${i}`}
                    className="absolute w-2 h-[800px] bg-gradient-to-t from-yellow-300 via-white to-cyan-200 shadow-2xl"
                    style={{
                      left: '50%',
                      top: '-300px',
                      transformOrigin: 'bottom center',
                      rotate: `${i * 15}deg`
                    }}
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ 
                      scaleY: [0, 2, 1.5],
                      opacity: [0, 1, 0.8],
                      filter: ["brightness(1)", "brightness(10)", "brightness(5)"]
                    }}
                    transition={{
                      duration: 4,
                      delay: i * 0.05,
                      ease: "easeOut"
                    }}
                  />
                ))}
                
                {/* 새로운 별들 탄생 */}
                {[...Array(150)].map((_, i) => (
                  <motion.div
                    key={`newborn-star-${i}`}
                    className="absolute w-3 h-3 bg-gradient-radial from-white via-yellow-300 to-orange-400 rounded-full shadow-2xl"
                    style={{
                      left: '50%',
                      top: '50%',
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: [0, 4, 2, 0.5],
                      opacity: [0, 1, 0.8, 0.9],
                      x: Math.cos(i * 2.4 * Math.PI / 180) * (100 + Math.random() * 300),
                      y: Math.sin(i * 2.4 * Math.PI / 180) * (100 + Math.random() * 300),
                      filter: ["brightness(1)", "brightness(8)", "brightness(4)", "brightness(2)"]
                    }}
                    transition={{
                      duration: 6,
                      delay: 1 + i * 0.008,
                      ease: "easeOut"
                    }}
                  />
                ))}
                
                {/* 차원의 균열 */}
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={`dimension-crack-${i}`}
                    className="absolute w-1 h-full bg-gradient-to-t from-purple-600 via-white to-cyan-300 shadow-2xl"
                    style={{
                      left: `${10 + i * 11}%`,
                      top: '0',
                      transformOrigin: 'center',
                      rotate: `${Math.random() * 30 - 15}deg`
                    }}
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ 
                      scaleY: [0, 1.5, 1],
                      opacity: [0, 1, 0.6],
                      filter: ["brightness(1)", "brightness(15)", "brightness(8)"]
                    }}
                    transition={{
                      duration: 3,
                      delay: 2 + i * 0.2,
                      ease: "easeOut"
                    }}
                  />
                ))}
                
                {/* 원시 에너지 폭발 */}
                {[...Array(60)].map((_, i) => (
                  <motion.div
                    key={`primal-energy-${i}`}
                    className="absolute w-6 h-6 bg-gradient-to-r from-cyan-300 via-white to-yellow-300 rounded-full shadow-xl"
                    style={{
                      left: '50%',
                      top: '50%',
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: [0, 5, 3, 1],
                      opacity: [0, 1, 0.8, 0.3],
                      x: Math.cos(i * 6 * Math.PI / 180) * (150 + Math.random() * 250),
                      y: Math.sin(i * 6 * Math.PI / 180) * (150 + Math.random() * 250),
                      filter: ["brightness(1)", "brightness(12)", "brightness(6)", "brightness(3)"]
                    }}
                    transition={{
                      duration: 5,
                      delay: 0.5 + i * 0.03,
                      ease: "easeOut"
                    }}
                  />
                ))}
                
                {/* 시공간 왜곡 링 */}
                {[...Array(10)].map((_, i) => (
                  <motion.div
                    key={`spacetime-ring-${i}`}
                    className="absolute inset-0 rounded-full border-4 border-white/80 shadow-2xl"
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ 
                      scale: [0, 6 + i * 0.8],
                      opacity: [1, 0],
                      filter: ["brightness(1)", "brightness(5)", "brightness(2)"]
                    }}
                    transition={{ duration: 6, delay: i * 0.2 }}
                  />
                ))}
                
                {/* 떠다니는 신성한 기하학 */}
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={`sacred-geometry-${i}`}
                    className="absolute w-10 h-10 border-2 border-yellow-300 opacity-80"
                    style={{
                      left: `${Math.random() * 80 + 10}%`,
                      top: `${Math.random() * 80 + 10}%`,
                      clipPath: i % 3 === 0 
                        ? 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' // 다이아몬드
                        : i % 3 === 1 
                        ? 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)' // 팔각형
                        : 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)' // 별
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: [0, 2, 1.5],
                      opacity: [0, 1, 0.8],
                      filter: ["brightness(1)", "brightness(6)", "brightness(3)"]
                    }}
                    transition={{
                      duration: 4,
                      delay: 3 + i * 0.2,
                      ease: "easeOut"
                    }}
                  />
                ))}
                
                {/* 무지개 오로라 */}
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={`aurora-${i}`}
                    className="absolute inset-0 rounded-2xl opacity-30"
                    style={{
                      background: `linear-gradient(${45 + i * 36}deg, 
                        rgba(255,0,150,0.6) 0%, 
                        rgba(0,255,255,0.6) 25%, 
                        rgba(255,255,0,0.6) 50%, 
                        rgba(150,255,0,0.6) 75%, 
                        rgba(255,100,255,0.6) 100%)`
                    }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ 
                      opacity: [0, 0.6, 0.3],
                      scale: [0, 1.5, 2]
                    }}
                    transition={{ 
                      duration: 5, 
                      delay: 4 + i * 0.5,
                      ease: "easeOut"
                    }}
                  />
                ))}
              </>
            )}

            {/* Material Rarity - 고대 숲의 깨어남 이펙트 */}
            {card.rarity === 'material' && (
              <>
                {/* 대지에서 솟아오르는 거대한 나무 */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={`ancient-tree-${i}`}
                    className="absolute w-8 h-96 bg-gradient-to-t from-amber-800 via-green-700 to-green-400 rounded-full shadow-2xl"
                    style={{
                      left: `${15 + i * 12}%`,
                      bottom: '-200px',
                    }}
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ 
                      scaleY: [0, 1.2, 1],
                      opacity: [0, 1, 0.9],
                      filter: ["brightness(1)", "brightness(1.5)", "brightness(1.2)"]
                    }}
                    transition={{
                      duration: 3,
                      delay: i * 0.3,
                      ease: "easeOut"
                    }}
                  />
                ))}
                
                {/* 마법의 잎사귀 회오리 */}
                {[...Array(50)].map((_, i) => (
                  <motion.div
                    key={`magic-leaf-${i}`}
                    className="absolute w-4 h-8 bg-gradient-to-b from-green-300 via-emerald-400 to-teal-500 shadow-lg"
                    style={{
                      left: '50%',
                      top: '50%',
                      clipPath: 'polygon(50% 0%, 80% 30%, 100% 50%, 80% 80%, 50% 100%, 20% 80%, 0% 50%, 20% 30%)'
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: [0, 1.5, 1, 0],
                      opacity: [0, 1, 0.8, 0],
                      x: Math.cos(i * 7.2 * Math.PI / 180) * (80 + Math.random() * 120),
                      y: Math.sin(i * 7.2 * Math.PI / 180) * (80 + Math.random() * 120),
                      rotate: Math.random() * 720,
                      filter: ["brightness(1)", "brightness(2)", "brightness(1.5)", "brightness(1)"]
                    }}
                    transition={{
                      duration: 4,
                      delay: 1 + i * 0.03,
                      ease: "easeOut"
                    }}
                  />
                ))}
                
                {/* 꽃잎 샤워 */}
                {[...Array(80)].map((_, i) => (
                  <motion.div
                    key={`petal-${i}`}
                    className="absolute w-2 h-3 bg-gradient-to-b from-pink-300 to-rose-400 rounded-full opacity-80 shadow-sm"
                    style={{
                      left: `${Math.random() * 120 - 10}%`,
                      top: `-30px`,
                      clipPath: 'ellipse(60% 100% at 50% 100%)'
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ 
                      opacity: [0, 1, 0.8, 0],
                      y: 500,
                      x: Math.sin(i * 0.1) * 150,
                      rotate: Math.random() * 720,
                      scale: [0.5, 1, 0.8, 0.5]
                    }}
                    transition={{
                      duration: 6,
                      delay: 2 + i * 0.02,
                      ease: "linear"
                    }}
                  />
                ))}
                
                {/* 번개처럼 뻗어나가는 덩굴 */}
                {[...Array(12)].map((_, i) => (
                  <motion.div
                    key={`vine-${i}`}
                    className="absolute w-2 h-64 bg-gradient-to-t from-green-600 via-green-400 to-lime-300 rounded-full shadow-lg"
                    style={{
                      left: `${Math.random() * 100}%`,
                      bottom: '0',
                      transformOrigin: 'bottom center',
                      rotate: `${Math.random() * 60 - 30}deg`
                    }}
                    initial={{ scaleY: 0, opacity: 0 }}
                    animate={{ 
                      scaleY: [0, 1.3, 1],
                      opacity: [0, 1, 0.8],
                      filter: ["brightness(1)", "brightness(2)", "brightness(1.3)"]
                    }}
                    transition={{
                      duration: 2,
                      delay: 0.5 + i * 0.1,
                      ease: "easeOut"
                    }}
                  />
                ))}
                
                {/* 생명의 빛 입자들 */}
                {[...Array(40)].map((_, i) => (
                  <motion.div
                    key={`life-particle-${i}`}
                    className="absolute w-3 h-3 bg-gradient-radial from-yellow-200 via-green-300 to-emerald-400 rounded-full shadow-lg"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: [0, 2, 1.5, 0.8],
                      opacity: [0, 1, 0.8, 0.6],
                      y: [-20, -100, -50],
                      filter: ["brightness(1)", "brightness(3)", "brightness(2)", "brightness(1)"]
                    }}
                    transition={{
                      duration: 4,
                      delay: 1.5 + i * 0.05,
                      ease: "easeOut"
                    }}
                  />
                ))}
                
                {/* 확장하는 자연의 기운 */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={`nature-aura-${i}`}
                    className="absolute inset-0 rounded-2xl border-2 border-green-400/70"
                    initial={{ scale: 0, opacity: 1 }}
                    animate={{ 
                      scale: [0, 2.5 + i * 0.3],
                      opacity: [1, 0],
                      filter: ["brightness(1)", "brightness(2)"]
                    }}
                    transition={{ duration: 3, delay: i * 0.4 }}
                  />
                ))}
                
                {/* 반짝이는 이슬방울 */}
                {[...Array(25)].map((_, i) => (
                  <motion.div
                    key={`dewdrop-${i}`}
                    className="absolute w-1 h-1 bg-cyan-200 rounded-full shadow-sm opacity-80"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `${Math.random() * 100}%`,
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ 
                      scale: [0, 3, 2],
                      opacity: [0, 1, 0.6],
                      filter: ["brightness(1)", "brightness(4)", "brightness(2)"]
                    }}
                    transition={{
                      duration: 2,
                      delay: 3 + i * 0.08,
                      ease: "easeOut"
                    }}
                  />
                ))}
              </>
            )}

            {/* Universal effects for all rarities */}
            {/* Main flash */}
            <motion.div
              className={`absolute inset-0 bg-gradient-to-r ${getRarityColor(card.rarity)} rounded-2xl`}
              initial={{ opacity: 0 }}
              animate={{ 
                opacity: [0, 0.3, 0]
              }}
              transition={{ duration: 0.5, delay: 0.2 }}
            />
            
            {/* Outer glow */}
            <motion.div
              className={`absolute inset-0 rounded-2xl bg-gradient-to-r ${getRarityColor(card.rarity)} blur-xl`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 3, 2],
                opacity: [0, 0.4, 0.1]
              }}
              transition={{ duration: 3 }}
            />
            
            {/* Shockwave */}
            <motion.div
              className="absolute inset-0 rounded-2xl border-2 border-white"
              initial={{ scale: 0, opacity: 1 }}
              animate={{ 
                scale: [0, 4],
                opacity: [1, 0]
              }}
              transition={{ duration: 1.5, delay: 0.3 }}
            />
          </>
        )}
      </AnimatePresence>

      {/* Card Container */}
      <motion.div
        className="relative w-full h-full cursor-pointer"
        variants={cardVariants}
        animate={isFlipped ? "flipped" : "hidden"}
        onClick={clickToReveal ? handleReveal : undefined}
        style={{ transformStyle: 'flat' }} // 3D 변형 제거
      >
        {/* Card Back */}
        <motion.div
          className="absolute inset-0 w-full h-full"
          variants={backVariants}
          animate={isFlipped ? "hidden" : "visible"}
          style={{ 
            zIndex: isFlipped ? 1 : 10,
            transform: 'none' // 변형 제거
          }}
        >
          <div className={`
            w-full h-full rounded-2xl border-2 border-gray-300 
            shadow-xl ${getRarityGlow(card.rarity)}
            flex flex-col items-center justify-center
            transition-all duration-300 relative overflow-hidden
            ${clickToReveal ? 'hover:scale-105 hover:shadow-2xl cursor-pointer' : ''}
          `}>
            {/* BG 이미지를 카드 뒷면으로 사용 */}
            <img 
              src={getCardBgImageUrl(card)} 
              alt="카드 뒷면"
              className="absolute inset-0 w-full h-full object-cover rounded-2xl"
              style={{
                zIndex: 1,
                transform: 'none' // 변형 제거
              }}
              onLoad={() => {
                console.log('🎴 Card BACK BG image loaded:', getCardBgImageUrl(card))
              }}
              onError={() => {
                console.log('❌ Card BACK BG image failed:', getCardBgImageUrl(card))
              }}
            />
            
            {/* 완전히 깔끔한 카드 뒷면 - BG 이미지만 표시, 텍스트 없음 */}
          </div>
        </motion.div>

        {/* Card Front - 완전히 덮어씀 */}
        {isFlipped && (
          <div
            className="absolute inset-0 w-full h-full"
            style={{ 
              zIndex: 9999,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
          >
            <div className={`
              w-full h-full rounded-2xl border-2
              bg-gradient-to-br ${getRarityColor(card.rarity)}
              shadow-xl ${getRarityGlow(card.rarity)}
              overflow-hidden relative
            `} style={{ 
              minHeight: '411px', 
              display: 'block',
              position: 'relative',
              zIndex: 9999
            }}>
              {/* 전체 카드 영역을 실제 카드 이미지로 채움 - 글자 없이 이미지만 */}
              <motion.img 
                src={getActualCardImageUrl(card)} 
                alt={card.name}
                className="w-full h-full object-cover rounded-2xl"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  zIndex: 200,
                  transform: 'none' // 어떤 변형도 적용하지 않음
                }}
                initial={{ 
                  opacity: 0, 
                  scale: 0.3
                }}
                animate={{ 
                  opacity: 1,
                  scale: [0.3, 1.3, 1]
                }}
                transition={{ 
                  delay: duration * 0.7,
                  duration: 1.2,
                  ease: [0.68, -0.55, 0.265, 1.55],
                  scale: {
                    times: [0, 0.6, 1]
                  }
                }}
                onLoad={(e) => {
                  const actualUrl = getActualCardImageUrl(card)
                  console.log('🎉 Actual card image loaded successfully!')
                  console.log('Card name:', card.name)
                  console.log('Actual card URL:', actualUrl)
                  
                  // 강제로 이미지가 보이도록 설정
                  const img = e.target as HTMLImageElement
                  img.style.display = 'block'
                  img.style.visibility = 'visible'
                  img.style.opacity = '1'
                  img.style.zIndex = '1000'
                  img.style.transform = 'none' // 변형 제거
                  
                  console.log('✅ Actual card image forced to be visible')
                }}
                onError={(e) => {
                  const actualUrl = getActualCardImageUrl(card)
                  console.log('❌ Actual card image failed to load!')
                  console.log('Card name:', card.name)
                  console.log('Actual card URL:', actualUrl)
                  console.log('Trying fallback to default image...')
                  
                  // 폴백 이미지로 변경
                  const img = e.target as HTMLImageElement
                  img.src = '/images/cards/default.jpg'
                }}
              />

            {/* Holographic effect for epic+ cards */}
            {(card.rarity === 'epic' || card.rarity === 'legendary') && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -rotate-45 -translate-x-full animate-pulse opacity-30"></div>
            )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}
