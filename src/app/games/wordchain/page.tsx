'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, Play, Pause, Clock, Users, 
  Send, RefreshCw, Trophy, MessageCircle, Bot, Settings
} from 'lucide-react'
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { WordChainGame } from '@/types'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { MEMBERS } from '@/contexts/AuthContext'

// 한국어 단어 데이터베이스 (실제로는 API에서 가져올 것)
const KOREAN_WORDS = new Set([
  '사과', '과일', '일요일', '일곱', '곱하기', '기차', '차례', '례의', '의사', '사람',
  '람보', '보리', '리본', '본부', '부모', '모자', '자동차', '차이', '이야기', '기억',
  '억지', '지구', '구름', '름차', '차가운', '운동', '동물', '물고기', '기다리다', '다리',
  '리더', '더위', '위험', '험난', '난로', '로켓', '켓볼', '볼펜', '펜실', '실험',
  '험악', '악기', '기타', '타자', '자전거', '거리', '리듬', '듬직', '직업', '업무',
  '무지개', '개미', '미소', '소리', '리얼', '얼음', '음식', '식당', '당근', '근육',
  '육류', '류머', '머리', '리포트', '트럭', '럭키', '키보드', '드라마', '마음', '음악',
  '악몽', '몽골', '골프', '프로', '로봇', '봇물', '물병', '병원', '원숭이', '이상',
  '상자', '자꾸', '꾸준히', '히터', '터널', '널뛰기', '기분', '분수', '수학', '학교',
  '교실', '실수', '수박', '박쥐', '쥐구멍', '멍멍이', '이름', '름다운', '운명', '명령',
  '령구슬', '슬픔', '픔격', '격투', '투명', '명백', '백합', '합격', '격자', '자료',
  '료리', '리모콘', '콘서트', '트위터', '터미널', '널찍', '찍다', '다음', '음성', '성공',
  '공부', '부엌', '엌가락', '락커', '커피', '피아노', '노래', '래퍼', '퍼즐', '즐거움',
  '움직임', '김치', '치킨', '킨더', '더블', '블록', '록스타', '타이어', '어둠', '둠칫',
  '칫솔', '솔직', '직진', '진실', '실패', '패턴', '턴테이블', '블루', '루비', '비행기',
  // 봇을 위한 추가 단어들
  '기린', '린스', '스타', '타워', '워터', '터치', '치과', '과자', '자석', '석유',
  '유리', '리스', '스포츠', '츠키', '키스', '스케이트', '트리', '리더십', '십자가', '가방',
  '방송', '송이', '이메일', '일반', '반복', '복숭아', '아기', '기록', '록음악', '악수',
  '수영', '영화', '화분', '분노', '노래방', '방문', '문제', '제목', '목소리', '리모델링',
  '링크', '크기', '기회', '회사', '사진', '진주', '주말', '말투', '투자', '자연',
  '연필', '필요', '요리', '리뷰', '뷰티', '티셔츠', '츠나미', '미래', '래시', '시간',
  '간식', '식물', '물감', '감정', '정치', '치료', '료금', '금요일', '일식', '식탁',
  '탁구', '구두', '두부', '부족', '족발', '발표', '표정', '정원', '원래', '래디오'
])

// 봇 플레이어 ID
const BOT_PLAYER_ID = 'bot-player'

export default function WordChainPage() {
  const router = useRouter()
  const { user } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  
  const [gameState, setGameState] = useState<WordChainGame>({
    id: '1',
    players: [],
    currentPlayer: '',
    words: [],
    usedWords: new Set(),
    isGameOver: false,
    currentWord: ''
  })
  
  const [inputWord, setInputWord] = useState('')
  const [timeLeft, setTimeLeft] = useState(30)
  const [isGameStarted, setIsGameStarted] = useState(false)
  const [gameTimer, setGameTimer] = useState<NodeJS.Timeout | null>(null)
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  
  // 봇 관련 상태
  const [botEnabled, setBotEnabled] = useState(false)
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal')
  const [showSettings, setShowSettings] = useState(false)
  const [botThinking, setBotThinking] = useState(false)
  
  // 점수 저장 관련
  const [gameStartTime, setGameStartTime] = useState<Date | null>(null)
  const [isSavingScore, setIsSavingScore] = useState(false)

  // 점수 저장
  const saveScore = useCallback(async (finalGameState: WordChainGame, winner: string) => {
    if (!user?.id || isSavingScore) return

    setIsSavingScore(true)
    try {
      const gameEndTime = new Date()
      const duration = gameStartTime ? 
        Math.floor((gameEndTime.getTime() - gameStartTime.getTime()) / 1000) : 0

      // 점수 계산: 단어 수 * 10 + 승리 보너스
      const wordCount = finalGameState.words.length
      const isWinner = winner === user.memberId
      const score = wordCount * 10 + (isWinner ? 100 : 0)

      const response = await fetch('/api/game-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: user.memberId || user.id,
          playerName: user.username || user.memberId,
          gameType: 'wordchain',
          score,
          level: wordCount,
          duration,
          gameData: {
            wordsUsed: finalGameState.words,
            totalWords: wordCount,
            isWinner,
            winner,
            players: finalGameState.players.filter(p => p !== BOT_PLAYER_ID)
          }
        })
      })

      const result = await response.json()
      if (result.success) {
        console.log('점수 저장 완료:', result)
        // 점수 저장 성공 알림
        let message = `점수가 저장되었습니다! 점수: ${score}점 (단어 ${wordCount}개)`
        
        if (result.isPersonalBest && result.isNewRecord) {
          message = `🎉 새로운 최고 기록이자 개인 최고 기록을 세웠습니다! 점수: ${score}점`
        } else if (result.isPersonalBest) {
          message = `🏆 개인 최고 기록을 세웠습니다! 점수: ${score}점`
        } else if (result.isNewRecord) {
          message = `🏆 새로운 최고 기록을 세웠습니다! 점수: ${score}점`
        }
        
        // 토스트 알림으로 표시
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
        if (data.settings.botSettings?.wordchain) {
          setBotEnabled(data.settings.botSettings.wordchain.enabled)
          setBotDifficulty(data.settings.botSettings.wordchain.difficulty)
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
          gameType: 'wordchain',
          settings: {
            bot: {
              enabled: botEnabled,
              difficulty: botDifficulty,
              responseTime: botDifficulty === 'easy' ? 3000 : botDifficulty === 'hard' ? 1000 : 2000
            }
          }
        })
      })
    } catch (error) {
      console.error('설정 저장 오류:', error)
    }
  }, [user?.id, botEnabled, botDifficulty])

  // 봇 AI 로직
  const findBotWord = useCallback((lastChar: string): string | null => {
    const possibleWords = Array.from(KOREAN_WORDS).filter(word => 
      word.charAt(0) === lastChar && !gameState.usedWords.has(word)
    )
    
    if (possibleWords.length === 0) return null
    
    // 난이도별 단어 선택 전략
    switch (botDifficulty) {
      case 'easy':
        // 쉬운 단어 우선 (짧은 단어)
        const easyWords = possibleWords.filter(word => word.length <= 3)
        return easyWords.length > 0 
          ? easyWords[Math.floor(Math.random() * easyWords.length)]
          : possibleWords[Math.floor(Math.random() * possibleWords.length)]
      
      case 'normal':
        // 랜덤 선택
        return possibleWords[Math.floor(Math.random() * possibleWords.length)]
      
      case 'hard':
        // 어려운 단어 우선 (긴 단어, 끝말잇기가 어려운 단어)
        const hardWords = possibleWords.filter(word => 
          word.length >= 4 || 
          Array.from(KOREAN_WORDS).filter(w => w.charAt(0) === word.charAt(word.length - 1)).length <= 3
        )
        return hardWords.length > 0
          ? hardWords[Math.floor(Math.random() * hardWords.length)]
          : possibleWords[Math.floor(Math.random() * possibleWords.length)]
      
      default:
        return possibleWords[Math.floor(Math.random() * possibleWords.length)]
    }
  }, [gameState.usedWords, botDifficulty])

  // 봇 플레이
  const botPlay = useCallback(() => {
    if (!isGameStarted || gameState.isGameOver || gameState.currentPlayer !== BOT_PLAYER_ID) return
    
    setBotThinking(true)
    
    // 봇 응답 시간 (난이도별)
    const responseTime = {
      easy: 3000,   // 3초
      normal: 2000, // 2초
      hard: 1000    // 1초
    }[botDifficulty]
    
    setTimeout(() => {
      const lastWord = gameState.words[gameState.words.length - 1]
      const lastChar = lastWord ? lastWord.charAt(lastWord.length - 1) : ''
      
      let botWord: string | null = null
      
      if (gameState.words.length === 0) {
        // 첫 단어 선택
        const startWords = ['안녕', '사과', '나무', '하늘', '바다']
        botWord = startWords[Math.floor(Math.random() * startWords.length)]
      } else {
        botWord = findBotWord(lastChar)
      }
      
      setBotThinking(false)
      
      if (botWord && !gameState.usedWords.has(botWord)) {
        // 봇이 단어를 찾았을 때
        const newUsedWords = new Set(gameState.usedWords)
        newUsedWords.add(botWord)
        
        const newWords = [...gameState.words, botWord]
        const currentPlayerIndex = gameState.players.indexOf(gameState.currentPlayer)
        const nextPlayerIndex = (currentPlayerIndex + 1) % gameState.players.length
        
        setGameState(prev => ({
          ...prev,
          words: newWords,
          usedWords: newUsedWords,
          currentPlayer: prev.players[nextPlayerIndex],
          currentWord: botWord!
        }))
        
        setTimeLeft(30)
      } else {
        // 봇이 단어를 찾지 못했을 때 (봇 패배)
        const humanPlayer = gameState.players.find(p => p !== BOT_PLAYER_ID)
        const winner = humanPlayer || ''
        
        setGameState(prev => ({
          ...prev,
          isGameOver: true,
          winner
        }))
        setIsGameStarted(false)
        
        // 점수 저장
        if (user?.id) {
          saveScore(gameState, winner)
        }
      }
    }, responseTime)
  }, [isGameStarted, gameState, botDifficulty, findBotWord])

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

  // 게임 초기화 (수정)
  const initGame = (players: string[]) => {
    if (players.length < 1) {
      setErrorMessage('최소 1명의 플레이어가 필요합니다.')
      return
    }

    let finalPlayers = [...players]
    
    // 봇 모드일 때 봇 플레이어 추가
    if (botEnabled && !finalPlayers.includes(BOT_PLAYER_ID)) {
      finalPlayers.push(BOT_PLAYER_ID)
    }
    
    if (finalPlayers.length < 2) {
      setErrorMessage('최소 2명의 플레이어가 필요합니다.')
      return
    }

    const shuffledPlayers = [...finalPlayers].sort(() => Math.random() - 0.5)
    setGameState({
      id: Date.now().toString(),
      players: shuffledPlayers,
      currentPlayer: shuffledPlayers[0],
      words: [],
      usedWords: new Set(),
      isGameOver: false,
      currentWord: ''
    })
    setIsGameStarted(true)
    setTimeLeft(30)
    setErrorMessage('')
    setGameStartTime(new Date())
  }

  // 단어 유효성 검사
  const isValidWord = (word: string): { isValid: boolean; reason?: string } => {
    if (!word || word.trim().length === 0) {
      return { isValid: false, reason: '단어를 입력해주세요.' }
    }

    const trimmedWord = word.trim()

    // 한글인지 확인
    const koreanRegex = /^[가-힣]+$/
    if (!koreanRegex.test(trimmedWord)) {
      return { isValid: false, reason: '한글 단어만 입력 가능합니다.' }
    }

    // 2글자 이상인지 확인
    if (trimmedWord.length < 2) {
      return { isValid: false, reason: '2글자 이상 입력해주세요.' }
    }

    // 이미 사용된 단어인지 확인
    if (gameState.usedWords.has(trimmedWord)) {
      return { isValid: false, reason: '이미 사용된 단어입니다.' }
    }

    // 끝말잇기 규칙 확인
    if (gameState.words.length > 0) {
      const lastWord = gameState.words[gameState.words.length - 1]
      const lastChar = lastWord.charAt(lastWord.length - 1)
      const firstChar = trimmedWord.charAt(0)
      
      if (lastChar !== firstChar) {
        return { isValid: false, reason: `'${lastChar}'로 시작하는 단어를 입력해주세요.` }
      }
    }

    // 단어 사전에 있는지 확인 (실제로는 API 호출)
    if (!KOREAN_WORDS.has(trimmedWord)) {
      return { isValid: false, reason: '사전에 없는 단어입니다.' }
    }

    return { isValid: true }
  }

  // 단어 제출
  const submitWord = () => {
    if (!isGameStarted || gameState.isGameOver) return

    const validation = isValidWord(inputWord)
    if (!validation.isValid) {
      setErrorMessage(validation.reason || '유효하지 않은 단어입니다.')
      return
    }

    const trimmedWord = inputWord.trim()
    const newUsedWords = new Set(gameState.usedWords)
    newUsedWords.add(trimmedWord)

    const newWords = [...gameState.words, trimmedWord]
    const currentPlayerIndex = gameState.players.indexOf(gameState.currentPlayer)
    const nextPlayerIndex = (currentPlayerIndex + 1) % gameState.players.length

    setGameState(prev => ({
      ...prev,
      words: newWords,
      usedWords: newUsedWords,
      currentPlayer: prev.players[nextPlayerIndex],
      currentWord: trimmedWord
    }))

    setInputWord('')
    setTimeLeft(30)
    setErrorMessage('')
  }

  // 타이머 종료 처리
  const handleTimeOut = () => {
    const winner = gameState.players.find(p => p !== gameState.currentPlayer) || ''
    
    setGameState(prev => ({
      ...prev,
      isGameOver: true,
      winner
    }))
    setIsGameStarted(false)
    if (gameTimer) {
      clearInterval(gameTimer)
    }
    
    // 점수 저장
    if (user?.id) {
      saveScore(gameState, winner)
    }
  }

  // 게임 종료 (포기)
  const forfeitGame = () => {
    const otherPlayers = gameState.players.filter(p => p !== gameState.currentPlayer)
    setGameState(prev => ({
      ...prev,
      isGameOver: true,
      winner: otherPlayers[Math.floor(Math.random() * otherPlayers.length)]
    }))
    setIsGameStarted(false)
    if (gameTimer) {
      clearInterval(gameTimer)
    }
  }

  // 타이머 효과
  useEffect(() => {
    if (isGameStarted && !gameState.isGameOver && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (timeLeft === 0) {
      handleTimeOut()
    }
  }, [timeLeft, isGameStarted, gameState.isGameOver])

  // 엔터 키 처리
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      submitWord()
    }
  }

  // 플레이어 선택 토글
  const togglePlayer = (playerId: string) => {
    setSelectedPlayers(prev => 
      prev.includes(playerId) 
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    )
  }

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
                <option value="easy">쉬움</option>
                <option value="normal">보통</option>
                <option value="hard">어려움</option>
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
    <div className="min-h-screen">
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
              <h1 className="text-xl font-bold text-gradient">끝말잇기</h1>
              {gameState.players.includes(BOT_PLAYER_ID) && (
                <span className="flex items-center text-xs px-2 py-1 bg-green-500 text-white rounded-full">
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
                setGameState(prev => ({ ...prev, isGameOver: false, words: [], usedWords: new Set() }))
                setSelectedPlayers([])
              }}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="pt-20 pb-12">
        <div className="max-w-4xl mx-auto p-6">
          {!isGameStarted && !gameState.isGameOver ? (
            /* 게임 시작 화면 */
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center"
            >
              <h1 className="text-4xl font-bold text-gradient mb-4">끝말잇기 게임</h1>
              <p className="text-lg text-gray-600 mb-8">
                친구들과 함께 즐기는 한글 끝말잇기 게임입니다!
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

                  {/* 봇 플레이어 표시 */}
                  {botEnabled && (
                    <motion.div
                      className="p-3 rounded-lg bg-green-50 border border-green-200"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-blue-400 rounded-full flex items-center justify-center">
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-green-800">AI 봇</p>
                          <p className="text-xs text-green-600">
                            난이도: {botDifficulty === 'easy' ? '쉬움' : botDifficulty === 'normal' ? '보통' : '어려움'}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {errorMessage && (
                    <motion.div
                      className="p-3 bg-red-100 text-red-700 rounded-lg text-sm"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      {errorMessage}
                    </motion.div>
                  )}
                </CardContent>

                <CardFooter>
                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => initGame(selectedPlayers)}
                    disabled={botEnabled ? selectedPlayers.length < 1 : selectedPlayers.length < 2}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    게임 시작 ({botEnabled ? selectedPlayers.length + 1 : selectedPlayers.length}명)
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ) : (
            /* 게임 플레이 화면 */
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* 게임 영역 */}
              <div className="lg:col-span-2">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-semibold text-primary-700">
                          {gameState.isGameOver ? '게임 종료!' : '게임 진행중'}
                        </h3>
                        {!gameState.isGameOver && (
                          <div className="flex items-center space-x-2">
                            <Clock className="w-4 h-4 text-orange-500" />
                            <span className={`font-bold ${timeLeft <= 10 ? 'text-red-500' : 'text-orange-500'}`}>
                              {timeLeft}초
                            </span>
                          </div>
                        )}
                      </div>

                      {gameState.isGameOver ? (
                        <motion.div
                          className="text-center py-4"
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                        >
                          <Trophy className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
                          <h2 className="text-2xl font-bold text-primary-700 mb-2">
                            🎉 {getPlayerName(gameState.winner || '')} 승리!
                          </h2>
                          <p className="text-gray-600">
                            총 {gameState.words.length}개의 단어가 사용되었습니다.
                          </p>
                        </motion.div>
                      ) : (
                        <div className="text-center">
                          <p className="text-lg">
                            현재 차례: <span className="font-bold text-primary-600">
                              {getCurrentPlayerName()}
                              {gameState.currentPlayer === BOT_PLAYER_ID && botThinking && (
                                <span className="ml-2 text-sm text-blue-600">(생각 중...)</span>
                              )}
                            </span>
                          </p>
                          {gameState.words.length > 0 && (
                            <p className="text-sm text-gray-600 mt-1">
                              '{gameState.words[gameState.words.length - 1]}'의 
                              '{gameState.words[gameState.words.length - 1].slice(-1)}'로 시작하는 단어
                            </p>
                          )}
                        </div>
                      )}
                    </CardHeader>

                    <CardContent>
                      {/* 단어 입력 */}
                      {!gameState.isGameOver && (
                        <div className="mb-6">
                          <div className="flex space-x-2">
                            <Input
                              ref={inputRef}
                              value={inputWord}
                              onChange={(e) => setInputWord(e.target.value)}
                              onKeyPress={handleKeyPress}
                              placeholder={
                                gameState.words.length === 0 
                                  ? "첫 번째 단어를 입력하세요..."
                                  : `'${gameState.words[gameState.words.length - 1].slice(-1)}'로 시작하는 단어...`
                              }
                              className="flex-1"
                              disabled={user?.memberId !== gameState.currentPlayer || gameState.currentPlayer === BOT_PLAYER_ID}
                            />
                            <Button
                              variant="primary"
                              onClick={submitWord}
                              disabled={user?.memberId !== gameState.currentPlayer || !inputWord.trim() || gameState.currentPlayer === BOT_PLAYER_ID}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>

                          {errorMessage && (
                            <motion.div
                              className="mt-2 p-2 bg-red-100 text-red-700 rounded text-sm"
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              {errorMessage}
                            </motion.div>
                          )}

                          {user?.memberId === gameState.currentPlayer && (
                            <div className="mt-2 flex justify-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={forfeitGame}
                                className="text-red-500 hover:text-red-700"
                              >
                                포기하기
                              </Button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 사용된 단어 목록 */}
                      <div className="max-h-96 overflow-y-auto">
                        <h4 className="font-semibold text-gray-700 mb-3">
                          사용된 단어 ({gameState.words.length}개)
                        </h4>
                        <div className="space-y-2">
                          <AnimatePresence>
                            {gameState.words.map((word, index) => (
                              <motion.div
                                key={index}
                                className="flex items-center justify-between p-3 glass-button rounded-lg"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                exit={{ opacity: 0, x: 20 }}
                              >
                                <div className="flex items-center space-x-3">
                                  <span className="w-6 h-6 bg-primary-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
                                    {index + 1}
                                  </span>
                                  <span className="font-medium">{word}</span>
                                </div>
                                <span className="text-sm text-gray-500">
                                  {getPlayerName(gameState.players[index % gameState.players.length])}
                                </span>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        </div>
                      </div>
                    </CardContent>

                    {gameState.isGameOver && (
                      <CardFooter>
                        <Button
                          variant="primary"
                          className="w-full"
                          onClick={() => {
                            setIsGameStarted(false)
                            setGameState(prev => ({ ...prev, isGameOver: false, words: [], usedWords: new Set() }))
                            setSelectedPlayers([])
                          }}
                        >
                          새 게임 시작
                        </Button>
                      </CardFooter>
                    )}
                  </Card>
                </motion.div>
              </div>

              {/* 사이드바 */}
              <div className="space-y-6">
                {/* 플레이어 목록 */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-semibold text-primary-700 flex items-center">
                        <Users className="w-5 h-5 mr-2" />
                        플레이어
                      </h3>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {gameState.players.map((playerId, index) => (
                          <div
                            key={playerId}
                            className={`p-3 rounded-lg flex items-center space-x-3 ${
                              playerId === gameState.currentPlayer && !gameState.isGameOver
                                ? playerId === BOT_PLAYER_ID
                                  ? 'bg-green-500 text-white'
                                  : 'bg-primary-500 text-white'
                                : 'glass-button'
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              playerId === BOT_PLAYER_ID
                                ? 'bg-gradient-to-br from-green-400 to-blue-400'
                                : 'bg-gradient-to-br from-primary-400 to-warm-400'
                            }`}>
                              {playerId === BOT_PLAYER_ID ? (
                                <Bot className="w-4 h-4 text-white" />
                              ) : (
                                <span className="text-white text-sm font-bold">
                                  {getPlayerName(playerId).charAt(0)}
                                </span>
                              )}
                            </div>
                            <div>
                              <p className="font-medium flex items-center">
                                {getPlayerName(playerId)}
                                {playerId === BOT_PLAYER_ID && playerId === gameState.currentPlayer && botThinking && (
                                  <span className="ml-2 text-xs opacity-75">(생각중...)</span>
                                )}
                              </p>
                              <p className="text-xs opacity-75">
                                {gameState.words.filter((_, i) => i % gameState.players.length === index).length}단어
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* 게임 규칙 */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Card>
                    <CardHeader>
                      <h3 className="text-lg font-semibold text-primary-700">게임 규칙</h3>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <div>• 한글 단어만 입력 가능</div>
                      <div>• 2글자 이상의 단어</div>
                      <div>• 이전 단어의 마지막 글자로 시작</div>
                      <div>• 이미 사용된 단어 불가</div>
                      <div>• 30초 이내에 입력</div>
                      <div>• 시간 초과 시 패배</div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* 통계 */}
                {gameState.words.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <Card>
                      <CardHeader>
                        <h3 className="text-lg font-semibold text-primary-700">게임 통계</h3>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-primary-600">
                            {gameState.words.length}
                          </div>
                          <div className="text-sm text-gray-500">총 단어 수</div>
                        </div>
                        {gameState.words.length > 0 && (
                          <div className="text-center">
                            <div className="text-lg font-bold text-green-600">
                              {gameState.words[gameState.words.length - 1]}
                            </div>
                            <div className="text-sm text-gray-500">마지막 단어</div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 설정 모달 */}
      {showSettings && <SettingsModal />}
    </div>
  )
} 