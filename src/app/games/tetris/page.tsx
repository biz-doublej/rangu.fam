'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, Play, Pause, RotateCw, ArrowDown,
  Trophy, RefreshCw, Volume2, Settings, Bot, User
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { TetrisGameState, TetrisPiece } from '@/types'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

// 테트리스 조각들 정의
const TETRIS_PIECES = [
  // I 조각 (막대기)
  [
    [[1, 1, 1, 1]],
    [[1], [1], [1], [1]]
  ],
  // O 조각 (정사각형)
  [
    [[1, 1], [1, 1]]
  ],
  // T 조각
  [
    [[0, 1, 0], [1, 1, 1]],
    [[1, 0], [1, 1], [1, 0]],
    [[1, 1, 1], [0, 1, 0]],
    [[0, 1], [1, 1], [0, 1]]
  ],
  // S 조각
  [
    [[0, 1, 1], [1, 1, 0]],
    [[1, 0], [1, 1], [0, 1]]
  ],
  // Z 조각
  [
    [[1, 1, 0], [0, 1, 1]],
    [[0, 1], [1, 1], [1, 0]]
  ],
  // J 조각
  [
    [[1, 0, 0], [1, 1, 1]],
    [[1, 1], [1, 0], [1, 0]],
    [[1, 1, 1], [0, 0, 1]],
    [[0, 1], [0, 1], [1, 1]]
  ],
  // L 조각
  [
    [[0, 0, 1], [1, 1, 1]],
    [[1, 0], [1, 0], [1, 1]],
    [[1, 1, 1], [1, 0, 0]],
    [[1, 1], [0, 1], [0, 1]]
  ]
]

const COLORS = [
  '#00f5ff', // I - 하늘색
  '#ffff00', // O - 노랑
  '#800080', // T - 보라
  '#00ff00', // S - 초록
  '#ff0000', // Z - 빨강
  '#0000ff', // J - 파랑
  '#ffa500'  // L - 주황
]

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20

export default function TetrisPage() {
  const router = useRouter()
  const { user } = useAuth()
  
  const [gameState, setGameState] = useState<TetrisGameState>({
    board: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)),
    currentPiece: null,
    nextPiece: null,
    score: 0,
    level: 1,
    lines: 0,
    isGameOver: false,
    isPaused: false
  })

  // 새로운 상태들 추가
  const [keySettings, setKeySettings] = useState({
    moveLeft: 'ArrowLeft',
    moveRight: 'ArrowRight',
    softDrop: 'ArrowDown',
    hardDrop: ' ',
    rotateLeft: 'z',
    rotateRight: 'ArrowUp',
    rotate180: 'a',
    hold: 'c'
  })
  
  const [showSettings, setShowSettings] = useState(false)
  const [isRecordingKey, setIsRecordingKey] = useState<string | null>(null)
  const [botMode, setBotMode] = useState(false)
  const [botDifficulty, setBotDifficulty] = useState<'easy' | 'normal' | 'hard'>('normal')
  const [botIsPlaying, setBotIsPlaying] = useState(false)

  const [dropTime, setDropTime] = useState<number | null>(null)
  const [lastTime, setLastTime] = useState(0)
  const [gameStartTime, setGameStartTime] = useState<number>(0)
  const [isSavingScore, setIsSavingScore] = useState(false)

  // 새로운 조각 생성
  const createPiece = useCallback((): TetrisPiece => {
    const pieceIndex = Math.floor(Math.random() * TETRIS_PIECES.length)
    const rotationIndex = 0
    return {
      shape: TETRIS_PIECES[pieceIndex][rotationIndex],
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(TETRIS_PIECES[pieceIndex][rotationIndex][0].length / 2),
      y: 0,
      color: pieceIndex + 1
    }
  }, [])

  // 게임 초기화
  const initGame = useCallback(() => {
    const newPiece = createPiece()
    const nextPiece = createPiece()
    
    setGameState({
      board: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)),
      currentPiece: newPiece,
      nextPiece: nextPiece,
      score: 0,
      level: 1,
      lines: 0,
      isGameOver: false,
      isPaused: false
    })
    setDropTime(1000)
    setGameStartTime(Date.now())
    setIsSavingScore(false)
  }, [createPiece])

  // 점수 저장
  const saveScore = useCallback(async (finalGameState: TetrisGameState) => {
    if (!user || isSavingScore) return
    
    setIsSavingScore(true)
    
    try {
      const duration = Math.floor((Date.now() - gameStartTime) / 1000) // 초 단위
      
      const response = await fetch('/api/game-scores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          playerId: user.memberId,
          playerName: user.username || user.memberId,
          gameType: 'tetris',
          score: finalGameState.score,
          level: finalGameState.level,
          duration,
          moves: 0, // 테트리스에서는 라인 수로 대체
          accuracy: Math.round((finalGameState.lines / (finalGameState.lines + finalGameState.level)) * 100),
          combo: finalGameState.level,
          difficulty: 'normal',
          gameData: {
            linesCleared: finalGameState.lines,
            maxLevel: finalGameState.level,
            blocksPlaced: finalGameState.score / 10 // 추정값
          }
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('점수 저장 완료:', result)
        
        // 점수 저장 성공 알림
        let message = `점수가 저장되었습니다!\n점수: ${finalGameState.score.toLocaleString()}점\n레벨: ${finalGameState.level}`
        
        if (result.isPersonalBest && result.isNewRecord) {
          message = `🎉 새로운 최고 기록이자 개인 최고 기록을 세웠습니다!\n점수: ${finalGameState.score.toLocaleString()}점`
        } else if (result.isPersonalBest) {
          message = `🏆 개인 최고 기록을 달성했습니다!\n점수: ${finalGameState.score.toLocaleString()}점`
        } else if (result.isNewRecord) {
          message = `🏆 새로운 최고 기록을 세웠습니다!\n점수: ${finalGameState.score.toLocaleString()}점`
        }
        
        // alert 대신 더 나은 방식으로 알림
        console.log('게임 결과:', message)
        
        // 간단한 토스트 알림으로 변경
        const toastDiv = document.createElement('div')
        toastDiv.className = 'fixed top-20 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce'
        toastDiv.innerHTML = `
          <div class="flex items-center space-x-2">
            <span>✅</span>
            <span>${message.replace(/\n/g, ' ')}</span>
          </div>
        `
        document.body.appendChild(toastDiv)
        
        // 3초 후 제거
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

  // 조각이 유효한 위치인지 확인
  const isValidPosition = useCallback((piece: TetrisPiece, board: number[][], dx = 0, dy = 0): boolean => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const newX = piece.x + x + dx
          const newY = piece.y + y + dy
          
          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return false
          }
          
          if (newY >= 0 && board[newY][newX]) {
            return false
          }
        }
      }
    }
    return true
  }, [])

  // 조각을 보드에 배치
  const placePiece = useCallback((piece: TetrisPiece, board: number[][]): number[][] => {
    const newBoard = board.map(row => [...row])
    
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardY = piece.y + y
          const boardX = piece.x + x
          if (boardY >= 0) {
            newBoard[boardY][boardX] = piece.color
          }
        }
      }
    }
    
    return newBoard
  }, [])

  // 완성된 라인 제거
  const clearLines = useCallback((board: number[][]): { newBoard: number[][], linesCleared: number } => {
    const newBoard = board.filter(row => row.some(cell => cell === 0))
    const linesCleared = BOARD_HEIGHT - newBoard.length
    
    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(0))
    }
    
    return { newBoard, linesCleared }
  }, [])

  // 조각 회전
  const rotatePiece = useCallback((piece: TetrisPiece, direction: number = 1): TetrisPiece => {
    let rotated = piece.shape
    
    if (direction === 1) {
      // 시계방향 (오른쪽) 회전
      rotated = piece.shape[0].map((_, index) =>
        piece.shape.map(row => row[index]).reverse()
      )
    } else if (direction === -1) {
      // 반시계방향 (왼쪽) 회전
      rotated = piece.shape[0].map((_, index) =>
        piece.shape.map(row => row[row.length - 1 - index])
      )
    } else if (direction === 2) {
      // 180도 회전
      rotated = piece.shape.map(row => row.slice().reverse()).reverse()
    }
    
    return {
      ...piece,
      shape: rotated
    }
  }, [])

  // 조각 이동
  const movePiece = useCallback((dx: number, dy: number) => {
    setGameState(prev => {
      if (!prev.currentPiece || prev.isGameOver || prev.isPaused) return prev
      
      if (isValidPosition(prev.currentPiece, prev.board, dx, dy)) {
        return {
          ...prev,
          currentPiece: {
            ...prev.currentPiece,
            x: prev.currentPiece.x + dx,
            y: prev.currentPiece.y + dy
          }
        }
      }
      
      // 아래로 이동할 수 없다면 조각을 배치
      if (dy > 0) {
        const newBoard = placePiece(prev.currentPiece, prev.board)
        const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard)
        
        const newScore = prev.score + linesCleared * 100 * prev.level + 10
        const newLines = prev.lines + linesCleared
        const newLevel = Math.floor(newLines / 10) + 1
        
        const newPiece = prev.nextPiece!
        const nextPiece = createPiece()
        
        // 게임 오버 체크
        if (!isValidPosition(newPiece, clearedBoard)) {
          return {
            ...prev,
            board: clearedBoard,
            score: newScore,
            level: newLevel,
            lines: newLines,
            isGameOver: true
          }
        }
        
        return {
          ...prev,
          board: clearedBoard,
          currentPiece: newPiece,
          nextPiece: nextPiece,
          score: newScore,
          level: newLevel,
          lines: newLines
        }
      }
      
      return prev
    })
  }, [isValidPosition, placePiece, clearLines, createPiece])

  // 조각 회전
  const handleRotate = useCallback((direction: number = 1) => {
    setGameState(prev => {
      if (!prev.currentPiece || prev.isGameOver || prev.isPaused) return prev
      
      const rotatedPiece = rotatePiece(prev.currentPiece, direction)
      
      if (isValidPosition(rotatedPiece, prev.board)) {
        return {
          ...prev,
          currentPiece: rotatedPiece
        }
      }
      
      return prev
    })
  }, [rotatePiece, isValidPosition])

  // 하드 드롭
  const hardDrop = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentPiece || prev.isGameOver || prev.isPaused) return prev
      
      let dropDistance = 0
      while (isValidPosition(prev.currentPiece, prev.board, 0, dropDistance + 1)) {
        dropDistance++
      }
      
      const droppedPiece = {
        ...prev.currentPiece,
        y: prev.currentPiece.y + dropDistance
      }
      
      const newBoard = placePiece(droppedPiece, prev.board)
      const { newBoard: clearedBoard, linesCleared } = clearLines(newBoard)
      
      const newScore = prev.score + linesCleared * 100 * prev.level + dropDistance * 2
      const newLines = prev.lines + linesCleared
      const newLevel = Math.floor(newLines / 10) + 1
      
      const newPiece = prev.nextPiece!
      const nextPiece = createPiece()
      
      if (!isValidPosition(newPiece, clearedBoard)) {
        return {
          ...prev,
          board: clearedBoard,
          score: newScore,
          level: newLevel,
          lines: newLines,
          isGameOver: true
        }
      }
      
      return {
        ...prev,
        board: clearedBoard,
        currentPiece: newPiece,
        nextPiece: nextPiece,
        score: newScore,
        level: newLevel,
        lines: newLines
      }
    })
  }, [isValidPosition, placePiece, clearLines, createPiece])

  // 설정 불러오기
  const loadSettings = useCallback(async () => {
    if (!user?.id) return
    
    try {
      const response = await fetch(`/api/game-settings?userId=${user.id}`)
      const data = await response.json()
      
      if (data.success && data.settings) {
        if (data.settings.tetrisKeys) {
          setKeySettings(data.settings.tetrisKeys)
        }
        if (data.settings.botSettings?.tetris) {
          setBotMode(data.settings.botSettings.tetris.enabled)
          setBotDifficulty(data.settings.botSettings.tetris.difficulty)
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
          gameType: 'tetris',
          settings: {
            keys: keySettings,
            bot: {
              enabled: botMode,
              difficulty: botDifficulty,
              speed: botDifficulty === 'easy' ? 0.5 : botDifficulty === 'hard' ? 2.0 : 1.0
            }
          }
        })
      })
    } catch (error) {
      console.error('설정 저장 오류:', error)
    }
  }, [user?.id, keySettings, botMode, botDifficulty])

  // 키 설정 변경
  const handleKeyChange = (action: string, newKey: string) => {
    setKeySettings(prev => ({ ...prev, [action]: newKey }))
  }

  // 키 기록 시작
  const startKeyRecord = (action: string) => {
    setIsRecordingKey(action)
  }

  // 키 입력 이벤트 (키 설정용)
  const handleKeyRecord = useCallback((e: KeyboardEvent) => {
    if (isRecordingKey) {
      e.preventDefault()
      const key = e.key === ' ' ? 'Space' : e.key
      handleKeyChange(isRecordingKey, e.key)
      setIsRecordingKey(null)
    }
  }, [isRecordingKey])

  // 봇 AI 로직
  const botPlay = useCallback(() => {
    if (!botIsPlaying || gameState.isGameOver || gameState.isPaused || !gameState.currentPiece) return

    // 봇 난이도에 따른 행동 결정
    const decisions = {
      easy: [
        () => movePiece(Math.random() > 0.5 ? -1 : 1, 0), // 랜덤 좌우 이동
        () => movePiece(0, 1), // 아래로 이동
        () => Math.random() > 0.8 && handleRotate() // 가끔 회전
      ],
      normal: [
        () => {
          // 간단한 최적화: 벽에 가까운 쪽으로 이동
          const piece = gameState.currentPiece!
          if (piece.x < BOARD_WIDTH / 2) {
            movePiece(-1, 0)
          } else {
            movePiece(1, 0)
          }
        },
        () => movePiece(0, 1),
        () => Math.random() > 0.6 && handleRotate()
      ],
      hard: [
        () => {
          // 고급 AI: 빈 공간 찾기
          const piece = gameState.currentPiece!
          let bestX = piece.x
          let maxSpace = 0
          
          for (let x = 0; x < BOARD_WIDTH - piece.shape[0].length; x++) {
            let space = 0
            for (let y = piece.y; y < BOARD_HEIGHT; y++) {
              if (gameState.board[y][x] === 0) space++
            }
            if (space > maxSpace) {
              maxSpace = space
              bestX = x
            }
          }
          
          if (bestX < piece.x) movePiece(-1, 0)
          else if (bestX > piece.x) movePiece(1, 0)
          else movePiece(0, 1)
        },
        () => {
          // 적절한 회전 찾기
          const piece = gameState.currentPiece!
          const rotated = rotatePiece(piece)
          if (isValidPosition(rotated, gameState.board)) {
            Math.random() > 0.3 && handleRotate()
          }
        }
      ]
    }

    const botActions = decisions[botDifficulty]
    const action = botActions[Math.floor(Math.random() * botActions.length)]
    action()
  }, [botIsPlaying, gameState, botDifficulty, movePiece, handleRotate, rotatePiece, isValidPosition])

  // 봇 플레이 타이머
  useEffect(() => {
    if (botIsPlaying && !gameState.isGameOver && !gameState.isPaused) {
      const speed = botDifficulty === 'easy' ? 1000 : botDifficulty === 'hard' ? 300 : 600
      const interval = setInterval(botPlay, speed)
      return () => clearInterval(interval)
    }
  }, [botPlay, botIsPlaying, gameState.isGameOver, gameState.isPaused, botDifficulty])

  // 키보드 이벤트 처리 (수정됨)
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (isRecordingKey) {
      handleKeyRecord(e)
      return
    }
    
    if (gameState.isGameOver || gameState.isPaused || botIsPlaying) return
    
    switch (e.key) {
      case keySettings.moveLeft:
        e.preventDefault()
        movePiece(-1, 0)
        break
      case keySettings.moveRight:
        e.preventDefault()
        movePiece(1, 0)
        break
      case keySettings.softDrop:
        e.preventDefault()
        movePiece(0, 1)
        break
      case keySettings.rotateLeft:
        e.preventDefault()
        handleRotate(-1) // 반시계방향
        break
      case keySettings.rotateRight:
        e.preventDefault()
        handleRotate(1) // 시계방향
        break
      case keySettings.rotate180:
        e.preventDefault()
        handleRotate(2) // 180도 회전
        break
      case keySettings.hardDrop:
        e.preventDefault()
        hardDrop()
        break
      case 'p': // 일시정지는 고정 키로 유지
        e.preventDefault()
        setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }))
        break
    }
  }, [gameState.isGameOver, gameState.isPaused, botIsPlaying, isRecordingKey, keySettings, movePiece, handleRotate, hardDrop, handleKeyRecord])

  // 게임 루프
  useEffect(() => {
    if (gameState.isGameOver || gameState.isPaused || !dropTime) return
    
    const interval = setInterval(() => {
      movePiece(0, 1)
    }, dropTime)
    
    return () => clearInterval(interval)
  }, [movePiece, dropTime, gameState.isGameOver, gameState.isPaused])

  // 레벨에 따른 드롭 속도 조정
  useEffect(() => {
    setDropTime(Math.max(50, 1000 - (gameState.level - 1) * 100))
  }, [gameState.level])

  // 키보드 이벤트 리스너 (키 기록 포함)
  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
  }, [handleKeyPress])

  // 게임 시작
  useEffect(() => {
    initGame()
    loadSettings()
  }, [initGame, loadSettings])

  // 게임 오버 시 점수 저장
  useEffect(() => {
    if (gameState.isGameOver && gameState.score > 0 && gameStartTime > 0) {
      saveScore(gameState)
    }
  }, [gameState.isGameOver, gameState.score, gameStartTime, saveScore, gameState])

  // 설정 저장
  useEffect(() => {
    saveSettings()
  }, [keySettings, botMode, botDifficulty])

  // 보드 렌더링 (현재 조각 포함)
  const renderBoard = () => {
    const displayBoard = gameState.board.map(row => [...row])
    
    // 현재 조각을 보드에 그리기
    if (gameState.currentPiece) {
      for (let y = 0; y < gameState.currentPiece.shape.length; y++) {
        for (let x = 0; x < gameState.currentPiece.shape[y].length; x++) {
          if (gameState.currentPiece.shape[y][x]) {
            const boardY = gameState.currentPiece.y + y
            const boardX = gameState.currentPiece.x + x
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              displayBoard[boardY][boardX] = gameState.currentPiece.color
            }
          }
        }
      }
    }
    
    return displayBoard
  }

  // 다음 조각 렌더링
  const renderNextPiece = () => {
    if (!gameState.nextPiece) return null
    
    return (
      <div className="grid grid-cols-4 gap-1 w-16 h-16">
        {Array(4).fill(null).map((_, y) =>
          Array(4).fill(null).map((_, x) => {
            const pieceY = y
            const pieceX = x
            const isActive = gameState.nextPiece!.shape[pieceY] && 
                           gameState.nextPiece!.shape[pieceY][pieceX]
            
            return (
              <div
                key={`${y}-${x}`}
                className={`w-3 h-3 border border-gray-300 ${
                  isActive 
                    ? `bg-blue-500` 
                    : 'bg-gray-100'
                }`}
                style={{
                  backgroundColor: isActive ? COLORS[gameState.nextPiece!.color - 1] : undefined
                }}
              />
            )
          })
        )}
      </div>
    )
  }

  // 키 설정 모달
  const KeySettingsModal = () => (
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
        
        {/* 키 설정 */}
        <div className="space-y-4 mb-6">
          <h4 className="font-semibold">키 설정</h4>
          {Object.entries(keySettings).map(([action, key]) => {
            const actionLabels: { [key: string]: string } = {
              moveLeft: '왼쪽으로 이동',
              moveRight: '오른쪽으로 이동',
              softDrop: '소프트 드랍',
              hardDrop: '하드 드랍',
              rotateLeft: '왼쪽으로 회전',
              rotateRight: '오른쪽으로 회전',
              rotate180: '180도 회전',
              hold: '홀드'
            };
            
            return (
            <div key={action} className="flex items-center justify-between">
              <span className="text-sm">
                {actionLabels[action] || action}
              </span>
              <Button
                variant={isRecordingKey === action ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => startKeyRecord(action)}
                className="min-w-24"
              >
                {isRecordingKey === action ? '키를 눌러주세요...' : 
                 key === ' ' ? 'Space' : key}
              </Button>
            </div>
            )
          })}
        </div>

        {/* 봇 설정 */}
        <div className="space-y-4 mb-6">
          <h4 className="font-semibold flex items-center">
            <Bot className="w-4 h-4 mr-2" />
            봇 대전
          </h4>
          
          <div className="flex items-center justify-between">
            <span className="text-sm">봇과 대전</span>
            <Button
              variant={botMode ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setBotMode(!botMode)}
            >
              {botMode ? '켜짐' : '꺼짐'}
            </Button>
          </div>

          {botMode && (
            <>
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
              
              <div className="flex items-center justify-between">
                <span className="text-sm">봇 플레이</span>
                <Button
                  variant={botIsPlaying ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setBotIsPlaying(!botIsPlaying)}
                  disabled={gameState.isGameOver}
                >
                  {botIsPlaying ? '정지' : '시작'}
                </Button>
              </div>
            </>
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

  const displayBoard = renderBoard()

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
              <h1 className="text-xl font-bold text-gradient">테트리스</h1>
              {botIsPlaying && (
                <span className="flex items-center text-xs px-2 py-1 bg-blue-500 text-white rounded-full">
                  <Bot className="w-3 h-3 mr-1" />
                  봇 플레이 중
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="glass"
                size="sm"
                onClick={() => setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }))}
              >
                {gameState.isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </Button>
              <Button variant="glass" size="sm" onClick={initGame}>
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button variant="glass" size="sm" onClick={() => setShowSettings(true)}>
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="pt-20 pb-12">
        <div className="max-w-6xl mx-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* 게임 보드 */}
            <div className="lg:col-span-2 flex justify-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="p-6">
                  <div className="relative">
                    {/* 게임 보드 */}
                    <div 
                      className="grid gap-px bg-gray-300 p-2 rounded-lg"
                      style={{ gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)` }}
                    >
                      {displayBoard.map((row, y) =>
                        row.map((cell, x) => (
                          <div
                            key={`${y}-${x}`}
                            className="w-6 h-6 border border-gray-400"
                            style={{
                              backgroundColor: cell ? COLORS[cell - 1] : '#f8f9fa'
                            }}
                          />
                        ))
                      )}
                    </div>

                    {/* 게임 오버 오버레이 */}
                    {gameState.isGameOver && (
                      <motion.div
                        className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center rounded-lg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="text-center text-white">
                          <h2 className="text-3xl font-bold mb-4">게임 오버!</h2>
                          <p className="text-xl mb-6">점수: {gameState.score.toLocaleString()}</p>
                          <Button variant="primary" onClick={initGame}>
                            다시 시작
                          </Button>
                        </div>
                      </motion.div>
                    )}

                    {/* 일시정지 오버레이 */}
                    {gameState.isPaused && !gameState.isGameOver && (
                      <motion.div
                        className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="text-center text-white">
                          <Pause className="w-16 h-16 mx-auto mb-4" />
                          <h2 className="text-2xl font-bold">일시정지</h2>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </Card>
              </motion.div>
            </div>

            {/* 사이드바 */}
            <div className="space-y-6">
              {/* 점수 및 레벨 */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-primary-700">게임 정보</h3>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-500">점수</p>
                      <p className="text-2xl font-bold text-primary-600">
                        {gameState.score.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">레벨</p>
                      <p className="text-xl font-bold text-green-600">{gameState.level}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">라인</p>
                      <p className="text-xl font-bold text-orange-600">{gameState.lines}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* 다음 조각 */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-primary-700">다음 조각</h3>
                  </CardHeader>
                  <CardContent className="flex justify-center">
                    {renderNextPiece()}
                  </CardContent>
                </Card>
              </motion.div>

              {/* 조작법 */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-primary-700">조작법</h3>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                        {keySettings.moveLeft === 'ArrowLeft' ? '←' : keySettings.moveLeft.toUpperCase()}/
                        {keySettings.moveRight === 'ArrowRight' ? '→' : keySettings.moveRight.toUpperCase()}
                      </span>
                      <span>좌우 이동</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                        {keySettings.softDrop === 'ArrowDown' ? '↓' : keySettings.softDrop.toUpperCase()}
                      </span>
                      <span>소프트 드랍</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                        {keySettings.hardDrop === ' ' ? 'Space' : keySettings.hardDrop.toUpperCase()}
                      </span>
                      <span>하드 드랍</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                        {keySettings.rotateLeft.toUpperCase()}
                      </span>
                      <span>왼쪽 회전</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                        {keySettings.rotateRight === 'ArrowUp' ? '↑' : keySettings.rotateRight.toUpperCase()}
                      </span>
                      <span>오른쪽 회전</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                        {keySettings.rotate180.toUpperCase()}
                      </span>
                      <span>180도 회전</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                        {keySettings.hold.toUpperCase()}
                      </span>
                      <span>홀드</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs">P</span>
                      <span>일시정지</span>
                    </div>
                    {botMode && (
                      <div className="mt-3 pt-3 border-t">
                        <div className="flex items-center justify-center text-blue-600">
                          <Bot className="w-4 h-4 mr-1" />
                          <span>봇 모드 활성화</span>
                        </div>
                        <div className="text-center text-xs text-gray-500 mt-1">
                          난이도: {botDifficulty === 'easy' ? '쉬움' : botDifficulty === 'normal' ? '보통' : '어려움'}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* 모바일 조작 버튼 */}
              <motion.div
                className="md:hidden"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
              >
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold text-primary-700">조작</h3>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2">
                      <div></div>
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() => handleRotate(1)}
                        className="aspect-square"
                      >
                        <RotateCw className="w-4 h-4" />
                      </Button>
                      <div></div>
                      
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() => movePiece(-1, 0)}
                        className="aspect-square"
                      >
                        ←
                      </Button>
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() => movePiece(0, 1)}
                        className="aspect-square"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="glass"
                        size="sm"
                        onClick={() => movePiece(1, 0)}
                        className="aspect-square"
                      >
                        →
                      </Button>
                      
                      <div></div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={hardDrop}
                        className="aspect-square"
                      >
                        DROP
                      </Button>
                      <div></div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      {/* 키 설정 모달 */}
      {showSettings && (
        <KeySettingsModal />
      )}
    </div>
  )
} 