'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Play, RefreshCw, Users, 
  Clock, Bot, Settings, Timer
} from 'lucide-react'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { CardGame, Card as GameCard } from '@/types'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { MEMBERS } from '@/contexts/AuthContext'

// 카드 슈트별 아이콘 컴포넌트
const CardIcon = ({ suit }: { suit: string }) => {
  const icons = {
    hearts: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠'
  }
  return <span className="text-lg">{icons[suit as keyof typeof icons]}</span>
}

// 카드 컴포넌트
const CardComponent = ({ 
  card, 
  isClickable = false, 
  onClick,
  isSelected = false 
}: { 
  card: GameCard
  isClickable?: boolean
  onClick?: () => void
  isSelected?: boolean
}) => {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds'
  
  return (
    <motion.div
      className={`
        w-16 h-24 bg-white rounded-lg border-2 shadow-lg flex flex-col items-center justify-center cursor-pointer
        ${isRed ? 'text-red-500' : 'text-black'}
        ${isClickable ? 'hover:scale-110 hover:shadow-xl' : ''}
        ${isSelected ? 'ring-4 ring-primary-500 scale-110' : ''}
        transition-all duration-200
      `}
      onClick={onClick}
      whileHover={isClickable ? { y: -8 } : {}}
      whileTap={isClickable ? { scale: 0.95 } : {}}
    >
      <div className="text-xs font-bold">{card.rank}</div>
      <CardIcon suit={card.suit} />
    </motion.div>
  )
}

// 봇 플레이어 ID
const BOT_PLAYER_ID = 'bot-player'

export default function CardGamePage() {
  const router = useRouter()
  const { user } = useAuth()
  
  const [gameState, setGameState] = useState<CardGame>({
    id: '1',
    players: [],
    deck: [],
    hands: {},
    currentPlayer: '',
    discardPile: [],
    isGameOver: false
  })
  
  const [isGameStarted, setIsGameStarted] = useState(false)
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [selectedCard, setSelectedCard] = useState<GameCard | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [gameMessage, setGameMessage] = useState('')
  
  // 봇 관련 상태
  const [botEnabled, setBotEnabled] = useState(false)
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal')
  const [showSettings, setShowSettings] = useState(false)
  const [botThinking, setBotThinking] = useState(false)
  
  // 타이머 관련 상태
  const [turnTimeLeft, setTurnTimeLeft] = useState(30)
  const [turnTimer, setTurnTimer] = useState<NodeJS.Timeout | null>(null)
  const [isTimeRunning, setIsTimeRunning] = useState(false)
  
  // 점수 저장 관련
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null)
  const [isSavingScore, setIsSavingScore] = useState(false)

  // 점수 저장
  const saveScore = useCallback(async (finalGameState: CardGame, winner: string) => {
    if (!user?.id || isSavingScore) return

    setIsSavingScore(true)
    try {
      const gameEndTime = new Date()
      const duration = gameStartTime ? 
        Math.floor((gameEndTime.getTime() - gameStartTime.getTime()) / 1000) : 0

      const isWinner = winner === user.memberId
      const timeBonus = duration > 0 ? Math.max(0, 300 - duration) : 0
      const score = isWinner ? (200 + timeBonus) : Math.max(50, timeBonus)

      const response = await fetch('/api/game-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: user.memberId || user.id,
          playerName: user.username || user.memberId,
          gameType: 'cardgame',
          score,
          level: finalGameState.players.length,
          duration,
          gameData: {
            isWinner,
            winner,
            players: finalGameState.players.filter(p => p !== BOT_PLAYER_ID),
            remainingCards: user.memberId ? (finalGameState.hands[user.memberId]?.length || 0) : 0
          }
        })
      })

      const result = await response.json()
      if (result.success) {
        console.log('점수 저장 완료:', result)
        let message = `점수가 저장되었습니다! 점수: ${score}점`
        
        if (result.isPersonalBest && result.isNewRecord) {
          message = `🎉 새로운 최고 기록이자 개인 최고 기록을 세웠습니다! 점수: ${score}점`
        } else if (result.isPersonalBest) {
          message = `🏆 개인 최고 기록을 세웠습니다! 점수: ${score}점`
        } else if (result.isNewRecord) {
          message = `🏆 새로운 최고 기록을 세웠습니다! 점수: ${score}점`
        }
        
        const toastDiv = document.createElement('div')
        toastDiv.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce'
        toastDiv.innerHTML = `
          <div class="flex items-center space-x-2">
            <span>✅</span>
            <span>${message}</span>
          </div>
        `
        document.body.appendChild(toastDiv)
        
        setTimeout(() => {
          if (toastDiv.parentNode) {
            toastDiv.remove()
          }
        }, 3000)
      }
    } catch (error) {
      console.error('점수 저장 오류:', error)
    } finally {
      setIsSavingScore(false)
    }
  }, [user, gameStartTime, isSavingScore])

  // 설정 불러오기
  const loadSettings = useCallback(async () => {
    if (!user?.id) return
    
    try {
      const response = await fetch(`/api/game-settings?userId=${user.id}`)
      const data = await response.json()
      
      if (data.success && data.settings) {
        if (data.settings.botSettings?.cardgame) {
          setBotEnabled(data.settings.botSettings.cardgame.enabled)
          setBotDifficulty(data.settings.botSettings.cardgame.difficulty)
        }
      }
    } catch (error) {
      console.error('설정 불러오기 오류:', error)
    }
  }, [user?.id])

  // 설정 저장하기
  const saveSettings = useCallback(async () => {
    if (!user?.id) return
    
    try {
      await fetch('/api/game-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          gameType: 'cardgame',
          settings: {
            bot: {
              enabled: botEnabled,
              difficulty: botDifficulty,
              strategy: botDifficulty === 'easy' ? 'defensive' : botDifficulty === 'hard' ? 'aggressive' : 'balanced'
            }
          }
        })
      })
    } catch (error) {
      console.error('설정 저장 오류:', error)
    }
  }, [user?.id, botEnabled, botDifficulty])

  // 타이머 시작
  const startTurnTimer = useCallback(() => {
    if (turnTimer) {
      clearInterval(turnTimer)
    }
    
    setTurnTimeLeft(30)
    setIsTimeRunning(true)
    
    const newTimer = setInterval(() => {
      setTurnTimeLeft(prev => {
        if (prev <= 1) {
          handleTimeOut()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    setTurnTimer(newTimer)
  }, [])

  // 타이머 정지
  const stopTurnTimer = useCallback(() => {
    if (turnTimer) {
      clearInterval(turnTimer)
      setTurnTimer(null)
    }
    setIsTimeRunning(false)
  }, [turnTimer])

  // 시간 종료 처리
  const handleTimeOut = useCallback(() => {
    if (!isGameStarted || gameState.isGameOver) return
    
    stopTurnTimer()
    
    if (gameState.currentPlayer !== BOT_PLAYER_ID) {
      setGameMessage('⏰ 시간 종료! 카드를 한 장 뽑습니다.')
      
      setTimeout(() => {
        drawCard()
        setTimeout(() => {
          passTurn()
        }, 1000)
      }, 500)
    }
  }, [isGameStarted, gameState, stopTurnTimer])

  // 고급 봇 AI 전략
  const selectSmartBotCard = useCallback((playableCards: GameCard[], topCard: GameCard, hand: GameCard[]): GameCard => {
    // 1. 승리 조건 체크 (카드 1장 남음)
    if (hand.length <= 2) {
      const sameRankCards = playableCards.filter(card => card.rank === topCard.rank)
      if (sameRankCards.length > 0) {
        return sameRankCards.sort((a, b) => a.value - b.value)[0]
      }
    }
    
    // 2. 상대방 패 분석
    const opponentHands = Object.values(gameState.hands).filter((cards, index) => 
      gameState.players[index] !== BOT_PLAYER_ID
    )
    const minOpponentCards = Math.min(...opponentHands.map(cards => cards.length))
    
    // 3. 상대가 적은 카드를 가졌을 때는 방어적으로
    if (minOpponentCards <= 3) {
      const sameRankCards = playableCards.filter(card => card.rank === topCard.rank)
      if (sameRankCards.length > 0) {
        return sameRankCards[0]
      }
    }
    
    // 4. 내 패에서 가장 많은 색깔 분석
    const mySuitCounts = hand.reduce((acc, card) => {
      acc[card.suit] = (acc[card.suit] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const bestSuit = Object.keys(mySuitCounts).reduce((a, b) => 
      mySuitCounts[a] > mySuitCounts[b] ? a : b
    )
    
    // 5. 최적 카드 선택
    const bestSuitCards = playableCards.filter(card => card.suit === bestSuit)
    if (bestSuitCards.length > 0) {
      return bestSuitCards.sort((a, b) => a.value - b.value)[0]
    }
    
    // 6. 차선책: 낮은 가치 카드부터
    return playableCards.sort((a, b) => a.value - b.value)[0]
  }, [gameState])

  // 봇 AI 로직
  const findBestBotCard = useCallback((hand: GameCard[], topCard: GameCard): GameCard | null => {
    const playableCards = hand.filter(card => canPlayCard(card))
    
    if (playableCards.length === 0) return null

    switch (botDifficulty) {
      case 'easy':
        return playableCards[0]
        
      case 'normal':
        const sameRankCards = playableCards.filter(card => card.rank === topCard.rank)
        if (sameRankCards.length > 0) {
          return sameRankCards[0]
        }
        
        const suitCounts = playableCards.reduce((acc, card) => {
          acc[card.suit] = (acc[card.suit] || 0) + 1
          return acc
        }, {} as Record<string, number>)
        
        const mostCommonSuit = Object.keys(suitCounts).reduce((a, b) => 
          suitCounts[a] > suitCounts[b] ? a : b
        )
        
        const mostCommonSuitCards = playableCards.filter(card => card.suit === mostCommonSuit)
        return mostCommonSuitCards[0] || playableCards[0]
        
      case 'hard':
        return selectSmartBotCard(playableCards, topCard, hand)
        
      default:
        return playableCards[0]
    }
  }, [botDifficulty, selectSmartBotCard])

  // 카드 생성
  const createDeck = useCallback((): GameCard[] => {
    const suits = ['hearts', 'diamonds', 'clubs', 'spades']
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
    const deck: GameCard[] = []
    
    suits.forEach(suit => {
      ranks.forEach((rank, index) => {
        deck.push({
          suit: suit as GameCard['suit'],
          rank: rank as GameCard['rank'],
          value: index + 1
        })
      })
    })
    
    // 셔플
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[deck[i], deck[j]] = [deck[j], deck[i]]
    }
    
    return deck
  }, [])

  // 게임 초기화
  const initGame = (players: string[]) => {
    if (players.length < 1) {
      setErrorMessage('최소 1명의 플레이어가 필요합니다.')
      return
    }

    let finalPlayers = [...players]
    
    if (botEnabled && !finalPlayers.includes(BOT_PLAYER_ID)) {
      finalPlayers.push(BOT_PLAYER_ID)
    }
    
    if (finalPlayers.length < 2) {
      setErrorMessage('최소 2명의 플레이어가 필요합니다.')
      return
    }

    const shuffledPlayers = [...finalPlayers].sort(() => Math.random() - 0.5)
    const deck = createDeck()
    const hands: { [key: string]: GameCard[] } = {}
    
    // 각 플레이어에게 5장씩 배분
    shuffledPlayers.forEach(player => {
      hands[player] = deck.splice(0, 5)
    })
    
    // 첫 번째 카드를 버리는 더미에 추가
    const firstCard = deck.pop()!
    
    setGameState({
      id: Date.now().toString(),
      players: shuffledPlayers,
      deck,
      hands,
      currentPlayer: shuffledPlayers[0],
      discardPile: [firstCard],
      isGameOver: false
    })
    
    setIsGameStarted(true)
    setErrorMessage('')
    setGameMessage(`${getPlayerName(shuffledPlayers[0])}님의 차례입니다!`)
    setGameStartTime(new Date())
    
    // 첫 턴 타이머 시작
    if (shuffledPlayers[0] !== BOT_PLAYER_ID) {
      startTurnTimer()
    }
  }

  // 카드 낼 수 있는지 확인
  const canPlayCard = (card: GameCard): boolean => {
    if (gameState.discardPile.length === 0) return true
    
    const topCard = gameState.discardPile[gameState.discardPile.length - 1]
    return card.suit === topCard.suit || card.rank === topCard.rank
  }

  // 카드 내기
  const playCard = (card: GameCard) => {
    if (!canPlayCard(card)) {
      setErrorMessage('이 카드는 낼 수 없습니다!')
      return
    }

    stopTurnTimer()

    const currentPlayerHand = gameState.hands[gameState.currentPlayer]
    const newHand = currentPlayerHand.filter(c => 
      !(c.suit === card.suit && c.rank === card.rank && c.value === card.value)
    )
    
    // 승리 조건 확인
    if (newHand.length === 0) {
      const winner = gameState.currentPlayer
      
      setGameState(prev => ({
        ...prev,
        hands: {
          ...prev.hands,
          [prev.currentPlayer]: newHand
        },
        discardPile: [...prev.discardPile, card],
        isGameOver: true,
        winner
      }))
      setGameMessage(`🎉 ${getCurrentPlayerName()} 승리!`)
      
      if (user?.id) {
        saveScore(gameState, winner)
      }
      return
    }

    // 다음 플레이어로 차례 넘기기
    const currentIndex = gameState.players.indexOf(gameState.currentPlayer)
    const nextIndex = (currentIndex + 1) % gameState.players.length
    const nextPlayer = gameState.players[nextIndex]

    setGameState(prev => ({
      ...prev,
      hands: {
        ...prev.hands,
        [prev.currentPlayer]: newHand
      },
      discardPile: [...prev.discardPile, card],
      currentPlayer: nextPlayer
    }))

    setSelectedCard(null)
    setErrorMessage('')
    setGameMessage(`${getPlayerName(nextPlayer)}님의 차례입니다!`)

    // 마지막 카드일 때 "원카드!" 외치기
    if (newHand.length === 1) {
      setGameMessage(`${getCurrentPlayerName()}님이 원카드를 외쳤습니다! 🎯`)
    }
    
    // 다음 플레이어가 봇이 아니면 타이머 시작
    if (nextPlayer !== BOT_PLAYER_ID) {
      startTurnTimer()
    }
  }

  // 카드 뽑기
  const drawCard = () => {
    stopTurnTimer()
    
    if (gameState.deck.length === 0) {
      const newDeck = [...gameState.discardPile.slice(0, -1)]
      for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]]
      }
      
      const drawnCard = newDeck.pop()!
      const newHand = [...gameState.hands[gameState.currentPlayer], drawnCard]
      
      setGameState(prev => ({
        ...prev,
        deck: newDeck,
        hands: {
          ...prev.hands,
          [prev.currentPlayer]: newHand
        },
        discardPile: [prev.discardPile[prev.discardPile.length - 1]]
      }))
    } else {
      const drawnCard = gameState.deck[gameState.deck.length - 1]
      const newDeck = gameState.deck.slice(0, -1)
      const newHand = [...gameState.hands[gameState.currentPlayer], drawnCard]
      
      setGameState(prev => ({
        ...prev,
        deck: newDeck,
        hands: {
          ...prev.hands,
          [prev.currentPlayer]: newHand
        }
      }))
    }
    
    setGameMessage('카드를 한 장 뽑았습니다!')
  }

  // 차례 넘기기
  const passTurn = () => {
    stopTurnTimer()
    
    const currentIndex = gameState.players.indexOf(gameState.currentPlayer)
    const nextIndex = (currentIndex + 1) % gameState.players.length
    const nextPlayer = gameState.players[nextIndex]

    setGameState(prev => ({
      ...prev,
      currentPlayer: nextPlayer
    }))

    setSelectedCard(null)
    setGameMessage(`${getPlayerName(nextPlayer)}님의 차례입니다!`)
    
    // 다음 플레이어가 봇이 아니면 타이머 시작
    if (nextPlayer !== BOT_PLAYER_ID) {
      startTurnTimer()
    }
  }

  // 봇 플레이
  const botPlay = useCallback(() => {
    if (!isGameStarted || gameState.isGameOver || gameState.currentPlayer !== BOT_PLAYER_ID) return
    
    setBotThinking(true)
    setGameMessage('🤖 봇이 카드를 선택하고 있습니다...')
    
    const responseTime = {
      easy: 2000,
      normal: 1500,
      hard: 1000
    }[botDifficulty]
    
    setTimeout(() => {
      const botHand = gameState.hands[BOT_PLAYER_ID] || []
      const topCard = gameState.discardPile[gameState.discardPile.length - 1]
      
      const cardToPlay = findBestBotCard(botHand, topCard)
      
      setBotThinking(false)
      
      if (cardToPlay) {
        playCard(cardToPlay)
      } else {
        // 봇이 카드를 낼 수 없는 경우
        const newDeck = [...gameState.deck]
        if (newDeck.length === 0) {
          const reshuffledDeck = [...gameState.discardPile.slice(0, -1)]
          for (let i = reshuffledDeck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            ;[reshuffledDeck[i], reshuffledDeck[j]] = [reshuffledDeck[j], reshuffledDeck[i]]
          }
          newDeck.push(...reshuffledDeck)
        }
        
        if (newDeck.length > 0) {
          const drawnCard = newDeck.pop()!
          const newHand = [...botHand, drawnCard]
          
          setGameState(prev => ({
            ...prev,
            deck: newDeck,
            hands: {
              ...prev.hands,
              [BOT_PLAYER_ID]: newHand
            }
          }))
          
          if (canPlayCard(drawnCard)) {
            setTimeout(() => {
              playCard(drawnCard)
            }, 500)
          } else {
            setTimeout(() => {
              passTurn()
            }, 500)
          }
        } else {
          passTurn()
        }
      }
    }, responseTime)
  }, [isGameStarted, gameState, botDifficulty, findBestBotCard])

  // 봇 플레이 트리거
  useEffect(() => {
    if (gameState.currentPlayer === BOT_PLAYER_ID && !gameState.isGameOver && isGameStarted) {
      botPlay()
    }
  }, [gameState.currentPlayer, gameState.isGameOver, isGameStarted, botPlay])

  // 초기화
  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  // 설정 변경 시 자동 저장
  useEffect(() => {
    if (user?.id) {
      saveSettings()
    }
  }, [botEnabled, botDifficulty, saveSettings])

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (turnTimer) {
        clearInterval(turnTimer)
      }
    }
  }, [turnTimer])

  const getCurrentPlayerName = () => {
    if (gameState.currentPlayer === BOT_PLAYER_ID) return '봇'
    const member = MEMBERS.find(m => m.id === gameState.currentPlayer)
    return member?.name || gameState.currentPlayer
  }

  const getPlayerName = (playerId: string) => {
    if (playerId === BOT_PLAYER_ID) return '봇'
    const member = MEMBERS.find(m => m.id === playerId)
    return member?.name || playerId
  }

  const togglePlayer = (playerId: string) => {
    setSelectedPlayers(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    )
  }

  // 설정 모달 컴포넌트
  const SettingsModal = () => (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
      >
        <h3 className="text-xl font-bold mb-4">게임 설정</h3>
        
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm">봇과 대전</span>
            <Button
              variant={botEnabled ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setBotEnabled(!botEnabled)}
            >
              {botEnabled ? '켜짐' : '꺼짐'}
            </Button>
          </div>

          {botEnabled && (
            <div className="flex items-center justify-between">
              <span className="text-sm">봇 난이도</span>
              <select
                value={botDifficulty}
                onChange={(e) => setBotDifficulty(e.target.value as any)}
                className="px-3 py-1 border rounded text-sm"
              >
                <option value="easy">쉬움 (랜덤)</option>
                <option value="normal">보통 (기본 전략)</option>
                <option value="hard">어려움 (고급 AI)</option>
              </select>
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          <Button variant="primary" onClick={() => setShowSettings(false)} className="flex-1">
            확인
          </Button>
          <Button variant="ghost" onClick={() => setShowSettings(false)} className="flex-1">
            취소
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50">
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
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-gradient">원카드</h1>
              {gameState.players.includes(BOT_PLAYER_ID) && (
                <span className="flex items-center text-xs px-2 py-1 bg-blue-500 text-white rounded-full">
                  <Bot className="w-3 h-3 mr-1" />
                  봇 참여 중
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="glass" size="sm" onClick={() => setShowSettings(true)}>
                <Settings className="w-4 h-4" />
              </Button>
              <Button variant="glass" size="sm" onClick={() => {
                setIsGameStarted(false)
                setGameState(prev => ({ ...prev, isGameOver: false }))
                setSelectedPlayers([])
                stopTurnTimer()
              }}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="pt-20 pb-12">
        <div className="max-w-6xl mx-auto p-6">
          {!isGameStarted && !gameState.isGameOver ? (
            /* 게임 시작 화면 */
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <h1 className="text-4xl font-bold text-gradient mb-4">원카드 게임</h1>
              <p className="text-lg text-gray-600 mb-8">
                친구들과 함께 즐기는 카드 게임! 먼저 모든 카드를 소진하는 사람이 승리합니다.
              </p>

              <Card className="max-w-md mx-auto">
                <CardHeader>
                  <h3 className="text-xl font-semibold text-primary-700">플레이어 선택</h3>
                  <p className="text-sm text-gray-600">
                    참여할 플레이어를 선택하세요 
                    {botEnabled ? ' (봇 플레이어 자동 포함)' : ' (최소 2명)'}
                  </p>
                </CardHeader>

                <CardContent className="space-y-3">
                  {MEMBERS.map((member) => (
                    <motion.div
                      key={member.id}
                      className={`p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedPlayers.includes(member.id)
                          ? 'bg-primary-500 text-white'
                          : 'glass-button hover:bg-primary-50'
                      }`}
                      onClick={() => togglePlayer(member.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-warm-400 rounded-full flex items-center justify-center">
                          <span className="text-white text-sm font-bold">
                            {member.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <p className="text-xs opacity-75">{member.role}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {botEnabled && (
                    <motion.div
                      className="p-3 rounded-lg bg-blue-100 border-2 border-blue-300"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-blue-700">AI 봇</p>
                          <p className="text-xs text-blue-600">
                            난이도: {botDifficulty === 'easy' ? '쉬움' : botDifficulty === 'normal' ? '보통' : '어려움'}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {errorMessage && (
                    <motion.div
                      className="p-3 bg-red-100 border border-red-300 rounded-lg"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <p className="text-red-600 text-sm">{errorMessage}</p>
                    </motion.div>
                  )}
                </CardContent>

                <CardFooter>
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => initGame(selectedPlayers)}
                    disabled={!botEnabled && selectedPlayers.length < 2}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    게임 시작
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ) : (
            /* 게임 진행 화면 */
            <div className="space-y-6">
              {/* 게임 상태 */}
              <motion.div
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h2 className="text-2xl font-bold text-primary-700 mb-2">원카드 게임</h2>
                
                {/* 타이머 표시 */}
                {isTimeRunning && gameState.currentPlayer !== BOT_PLAYER_ID && (
                  <motion.div
                    className="flex items-center justify-center space-x-2 mb-4"
                    animate={{ scale: turnTimeLeft <= 5 ? 1.1 : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Timer className={`w-5 h-5 ${turnTimeLeft <= 5 ? 'text-red-500' : 'text-blue-500'}`} />
                    <span className={`text-lg font-bold ${turnTimeLeft <= 5 ? 'text-red-500' : 'text-blue-500'}`}>
                      {turnTimeLeft}초
                    </span>
                  </motion.div>
                )}
                
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4" />
                    <span>{gameState.players.length}명</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>덱: {gameState.deck.length}장</span>
                  </div>
                </div>
                
                {gameMessage && (
                  <motion.p
                    className="text-lg text-primary-600 mt-4 font-medium"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={gameMessage}
                  >
                    {gameMessage}
                    {botThinking && (
                      <motion.span
                        className="ml-2"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      >
                        ...
                      </motion.span>
                    )}
                  </motion.p>
                )}
              </motion.div>

              {/* 게임 보드 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 상대방 카드 */}
                <motion.div
                  className="lg:col-span-2 space-y-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  {gameState.players
                    .filter(player => player !== user?.memberId)
                    .map(player => (
                      <Card key={player} className={gameState.currentPlayer === player ? 'border-primary-500 border-2' : ''}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-warm-400 rounded-full flex items-center justify-center">
                                {player === BOT_PLAYER_ID ? (
                                  <Bot className="w-4 h-4 text-white" />
                                ) : (
                                  <span className="text-white text-sm font-bold">
                                    {getPlayerName(player).charAt(0)}
                                  </span>
                                )}
                              </div>
                              <span className="font-medium">{getPlayerName(player)}</span>
                              {gameState.currentPlayer === player && (
                                <span className="px-2 py-1 bg-primary-500 text-white text-xs rounded-full">
                                  현재 차례
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-bold text-primary-600">
                                {gameState.hands[player]?.length || 0}장
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </motion.div>

                {/* 게임 중앙 */}
                <motion.div
                  className="space-y-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {/* 버린 카드 더미 */}
                  <Card>
                    <CardHeader>
                      <h4 className="text-lg font-semibold text-center">버린 카드</h4>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                      {gameState.discardPile.length > 0 && (
                        <CardComponent 
                          card={gameState.discardPile[gameState.discardPile.length - 1]} 
                        />
                      )}
                    </CardContent>
                  </Card>

                  {/* 게임 컨트롤 */}
                  <Card>
                    <CardContent className="p-4 space-y-3">
                      <Button
                        variant="primary"
                        className="w-full"
                        onClick={drawCard}
                        disabled={gameState.currentPlayer !== user?.memberId || gameState.isGameOver}
                      >
                        카드 뽑기
                      </Button>
                      
                      <Button
                        variant="ghost"
                        className="w-full"
                        onClick={passTurn}
                        disabled={gameState.currentPlayer !== user?.memberId || gameState.isGameOver}
                      >
                        차례 넘기기
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* 내 카드 */}
              {user?.memberId && gameState.hands[user.memberId] && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card className={gameState.currentPlayer === user.memberId ? 'border-primary-500 border-2' : ''}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold">내 카드</h4>
                        <span className="text-primary-600 font-bold">
                          {gameState.hands[user.memberId].length}장
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {gameState.hands[user.memberId].map((card, index) => (
                          <CardComponent
                            key={`${card.suit}-${card.rank}-${index}`}
                            card={card}
                            isClickable={gameState.currentPlayer === user.memberId && canPlayCard(card)}
                            onClick={() => {
                              if (gameState.currentPlayer === user.memberId && canPlayCard(card)) {
                                playCard(card)
                              }
                            }}
                            isSelected={selectedCard === card}
                          />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* 게임 종료 */}
              {gameState.isGameOver && (
                <motion.div
                  className="text-center"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <Card className="max-w-md mx-auto">
                    <CardContent className="p-6">
                      <h3 className="text-2xl font-bold text-primary-700 mb-4">🎉 게임 종료!</h3>
                      <p className="text-lg mb-4">
                        승리자: <span className="font-bold text-primary-600">
                          {getPlayerName(gameState.winner || '')}
                        </span>
                      </p>
                      <Button
                        variant="primary"
                        onClick={() => {
                          setIsGameStarted(false)
                          setGameState(prev => ({ ...prev, isGameOver: false }))
                          setSelectedPlayers([])
                          stopTurnTimer()
                        }}
                      >
                        새 게임 시작
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* 설정 모달 */}
      <AnimatePresence>
        {showSettings && <SettingsModal />}
      </AnimatePresence>
    </div>
  )
} 