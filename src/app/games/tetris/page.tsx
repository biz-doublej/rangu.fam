'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  ArrowLeft, Play, Pause, RotateCw, ArrowDown,
  Trophy, RefreshCw, Volume2, Settings, Bot, User,
  Zap, Target, Clock, Award
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

// Tetris types
interface JtrisPiece {
  shape: number[][]
  x: number
  y: number
  color: number
  type: string
}

interface JtrisGameState {
  board: number[][]
  currentPiece: JtrisPiece | null
  nextPieces: JtrisPiece[]
  holdPiece: JtrisPiece | null
  canHold: boolean
  score: number
  level: number
  lines: number
  attack: number
  finesse: number
  pps: number
  kpp: number
  totalPieces: number
  totalKeys: number
  gameTime: number
  isGameOver: boolean
  isPaused: boolean
  lastAction: string
}

interface GameStats {
  gameTime: number
  score: number
  attack: number
  finesse: number
  pps: number
  kpp: number
  totalPieces: number
}

interface BlockSkin {
  id: string
  name: string
  colors: string[]
  style: 'solid' | 'gradient' | 'pattern'
}

interface MultiplayerGameState {
  gameId: string
  players: PlayerData[]
  gameStatus: 'waiting' | 'playing' | 'finished'
  hostId: string
  createdAt: number
}

interface PlayerData {
  id: string
  username: string
  avatar?: string
  isBot: boolean
  gameState: JtrisGameState
  isReady: boolean
  rank?: number
  isHost: boolean
}

interface BotOpponent {
  id: string
  name: string
  difficulty: 'easy' | 'medium' | 'hard' | 'extreme'
  avatar: string
  personality: string
  gameState: JtrisGameState
  isBot: true
}

interface GameInvitation {
  id: string
  hostId: string
  hostName: string
  gameId: string
  invitedMemberIds: string[]
  createdAt: number
  expiresAt: number
  status: 'pending' | 'accepted' | 'declined' | 'expired'
}

interface Member {
  id: string
  username: string
  email: string
  avatar?: string
  isOnline: boolean
}

// Jtris style tetrominos with SRS (Super Rotation System)
const TETROMINOS = {
  I: {
    shape: [[1, 1, 1, 1]],
    rotations: [
      [[1, 1, 1, 1]],
      [[1], [1], [1], [1]],
      [[1, 1, 1, 1]],
      [[1], [1], [1], [1]]
    ],
    color: 0
  },
  O: {
    shape: [[1, 1], [1, 1]],
    rotations: [[[1, 1], [1, 1]]],
    color: 1
  },
  T: {
    shape: [[0, 1, 0], [1, 1, 1]],
    rotations: [
      [[0, 1, 0], [1, 1, 1]],
      [[1, 0], [1, 1], [1, 0]],
      [[1, 1, 1], [0, 1, 0]],
      [[0, 1], [1, 1], [0, 1]]
    ],
    color: 2
  },
  S: {
    shape: [[0, 1, 1], [1, 1, 0]],
    rotations: [
      [[0, 1, 1], [1, 1, 0]],
      [[1, 0], [1, 1], [0, 1]],
      [[0, 1, 1], [1, 1, 0]],
      [[1, 0], [1, 1], [0, 1]]
    ],
    color: 3
  },
  Z: {
    shape: [[1, 1, 0], [0, 1, 1]],
    rotations: [
      [[1, 1, 0], [0, 1, 1]],
      [[0, 1], [1, 1], [1, 0]],
      [[1, 1, 0], [0, 1, 1]],
      [[0, 1], [1, 1], [1, 0]]
    ],
    color: 4
  },
  J: {
    shape: [[1, 0, 0], [1, 1, 1]],
    rotations: [
      [[1, 0, 0], [1, 1, 1]],
      [[1, 1], [1, 0], [1, 0]],
      [[1, 1, 1], [0, 0, 1]],
      [[0, 1], [0, 1], [1, 1]]
    ],
    color: 5
  },
  L: {
    shape: [[0, 0, 1], [1, 1, 1]],
    rotations: [
      [[0, 0, 1], [1, 1, 1]],
      [[1, 0], [1, 0], [1, 1]],
      [[1, 1, 1], [1, 0, 0]],
      [[1, 1], [0, 1], [0, 1]]
    ],
    color: 6
  }
}

const PIECE_TYPES = Object.keys(TETROMINOS)

// Block skins
const BLOCK_SKINS: BlockSkin[] = [
  {
    id: 'classic',
    name: '클래식',
    colors: ['#00f5ff', '#ffff00', '#800080', '#00ff00', '#ff0000', '#0000ff', '#ffa500'],
    style: 'solid'
  },
  {
    id: 'neon',
    name: '네온',
    colors: ['#39ff14', '#ff073a', '#ff9800', '#e91e63', '#9c27b0', '#3f51b5', '#00bcd4'],
    style: 'gradient'
  },
  {
    id: 'pastel',
    name: '파스텔',
    colors: ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff', '#e6baff', '#ffc6ff'],
    style: 'solid'
  },
  {
    id: 'dark',
    name: '다크',
    colors: ['#2c3e50', '#34495e', '#7f8c8d', '#95a5a6', '#bdc3c7', '#ecf0f1', '#ffffff'],
    style: 'solid'
  },
  {
    id: 'rainbow',
    name: '레인보우',
    colors: ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'],
    style: 'gradient'
  }
]

const BOARD_WIDTH = 10
const BOARD_HEIGHT = 20
const NEXT_QUEUE_SIZE = 5

// SRS rotation system kick tests
const KICK_TESTS = {
  '0->1': [[-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '1->0': [[1, 0], [1, 1], [0, -2], [1, -2]],
  '1->2': [[1, 0], [1, 1], [0, -2], [1, -2]],
  '2->1': [[-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '2->3': [[1, 0], [1, -1], [0, 2], [1, 2]],
  '3->2': [[-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '3->0': [[-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '0->3': [[1, 0], [1, -1], [0, 2], [1, 2]]
}

export default function TetrisPage() {
  const router = useRouter()
  const { user } = useAuth()
  const gameStartTimeRef = useRef<number>(0)
  const frameRef = useRef<number>(0)
  
  const [gameState, setGameState] = useState<JtrisGameState>({
    board: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)),
    currentPiece: null,
    nextPieces: [],
    holdPiece: null,
    canHold: true,
    score: 0,
    level: 1,
    lines: 0,
    attack: 0,
    finesse: 0,
    pps: 0,
    kpp: 0,
    totalPieces: 0,
    totalKeys: 0,
    gameTime: 0,
    isGameOver: false,
    isPaused: false,
    lastAction: ''
  })

  // Control settings
  const [keySettings, setKeySettings] = useState({
    moveLeft: 'ArrowLeft',
    moveRight: 'ArrowRight',
    softDrop: 'ArrowDown',
    hardDrop: ' ',
    rotateLeft: 'z',
    rotateRight: 'x',
    rotate180: 'a',
    hold: 'c'
  })
  
  // UI states
  const [showSettings, setShowSettings] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'controls' | 'skins'>('controls')
  const [isRecordingKey, setIsRecordingKey] = useState<string | null>(null)
  const [selectedSkin, setSelectedSkin] = useState<string>('classic')
  const [showBotSelection, setShowBotSelection] = useState(false)
  
  // Game timing
  const [dropTime, setDropTime] = useState<number | null>(null)
  const [lockDelay, setLockDelay] = useState<number>(500)
  const [autoRepeatDelay, setAutoRepeatDelay] = useState<number>(170)
  const [autoRepeatRate, setAutoRepeatRate] = useState<number>(50)
  
  // Game stats tracking
  const [gameStats, setGameStats] = useState<GameStats>({
    gameTime: 0,
    score: 0,
    attack: 0,
    finesse: 0,
    pps: 0,
    kpp: 0,
    totalPieces: 0
  })
  
  // Performance tracking
  const [lastDropTime, setLastDropTime] = useState<number>(0)
  const [piecesPerSecond, setPiecesPerSecond] = useState<number[]>([])
  const [keysPressed, setKeysPressed] = useState<number>(0)
  const [perfectFinesse, setPerfectFinesse] = useState<number>(0)
  const [totalFinesse, setTotalFinesse] = useState<number>(0)
  
  // Multiplayer states
  const [gameMode, setGameMode] = useState<'single' | 'multiplayer' | 'bot'>('single')
  const [currentGameSession, setCurrentGameSession] = useState<MultiplayerGameState | null>(null)
  const [opponent, setOpponent] = useState<PlayerData | BotOpponent | null>(null)
  const [showGameLobby, setShowGameLobby] = useState(false)
  const [showMemberInvite, setShowMemberInvite] = useState(false)
  const [availableMembers, setAvailableMembers] = useState<Member[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<GameInvitation[]>([])
  const [gameInviteLink, setGameInviteLink] = useState<string>('')
  
  // Bot opponents
  const botOpponents: BotOpponent[] = [
    {
      id: 'bot-easy',
      name: 'Tetris Rookie',
      difficulty: 'easy',
      avatar: '🤖',
      personality: 'Friendly beginner bot that makes occasional mistakes.',
      gameState: { ...gameState, totalPieces: 0, score: 0 },
      isBot: true
    },
    {
      id: 'bot-medium', 
      name: 'Block Master',
      difficulty: 'medium',
      avatar: '🚀',
      personality: 'Balanced bot with good fundamentals.',
      gameState: { ...gameState, totalPieces: 0, score: 0 },
      isBot: true
    },
    {
      id: 'bot-hard',
      name: 'Tetris Pro',
      difficulty: 'hard',
      avatar: '⚡',
      personality: 'Advanced bot with aggressive gameplay.',
      gameState: { ...gameState, totalPieces: 0, score: 0 },
      isBot: true
    },
    {
      id: 'bot-extreme',
      name: 'The Architect',
      difficulty: 'extreme',
      avatar: '🧠', 
      personality: 'Master-level bot with perfect technique.',
      gameState: { ...gameState, totalPieces: 0, score: 0 },
      isBot: true
    }
  ]

  // Generate bag of 7 pieces (7-bag system)
  const generateBag = useCallback((): string[] => {
    const bag = [...PIECE_TYPES]
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[bag[i], bag[j]] = [bag[j], bag[i]]
    }
    return bag
  }, [])

  // Create piece from type
  const createPiece = useCallback((type: string): JtrisPiece => {
    const tetromino = TETROMINOS[type as keyof typeof TETROMINOS]
    const startX = Math.floor(BOARD_WIDTH / 2) - Math.floor(tetromino.shape[0].length / 2)
    return {
      shape: tetromino.rotations[0],
      x: startX,
      y: 0,
      color: tetromino.color,
      type: type
    }
  }, [])

  // Generate next pieces queue
  const fillNextQueue = useCallback((currentQueue: JtrisPiece[]): JtrisPiece[] => {
    const queue = [...currentQueue]
    while (queue.length < NEXT_QUEUE_SIZE) {
      const bag = generateBag()
      for (const type of bag) {
        if (queue.length < NEXT_QUEUE_SIZE) {
          queue.push(createPiece(type))
        }
      }
    }
    return queue
  }, [generateBag, createPiece])

  // Game initialization
  const initGame = useCallback(() => {
    const initialQueue = fillNextQueue([])
    const firstPiece = initialQueue[0]
    
    gameStartTimeRef.current = Date.now()
    
    setGameState({
      board: Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0)),
      currentPiece: firstPiece,
      nextPieces: initialQueue.slice(1),
      holdPiece: null,
      canHold: true,
      score: 0,
      level: 1,
      lines: 0,
      attack: 0,
      finesse: 0,
      pps: 0,
      kpp: 0,
      totalPieces: 1,
      totalKeys: 0,
      gameTime: 0,
      isGameOver: false,
      isPaused: false,
      lastAction: ''
    })
    
    setGameStats({
      gameTime: 0,
      score: 0,
      attack: 0,
      finesse: 0,
      pps: 0,
      kpp: 0,
      totalPieces: 1
    })
    
    setDropTime(1000)
    setKeysPressed(0)
    setPerfectFinesse(0)
    setTotalFinesse(0)
    setPiecesPerSecond([])
  }, [fillNextQueue])

  // Check if piece position is valid
  const isValidPosition = useCallback((piece: JtrisPiece, board: number[][], dx = 0, dy = 0): boolean => {
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

  // Get piece rotation with SRS
  const getRotatedPiece = useCallback((piece: JtrisPiece, direction: number): JtrisPiece => {
    const tetromino = TETROMINOS[piece.type as keyof typeof TETROMINOS]
    const currentRotation = tetromino.rotations.findIndex(r => 
      JSON.stringify(r) === JSON.stringify(piece.shape)
    )
    
    let newRotation = (currentRotation + direction) % tetromino.rotations.length
    if (newRotation < 0) newRotation = tetromino.rotations.length - 1
    
    return {
      ...piece,
      shape: tetromino.rotations[newRotation]
    }
  }, [])

  // Try rotation with wall kicks (SRS)
  const tryRotation = useCallback((piece: JtrisPiece, direction: number, board: number[][]): JtrisPiece | null => {
    const rotatedPiece = getRotatedPiece(piece, direction)
    
    // Try basic rotation first
    if (isValidPosition(rotatedPiece, board)) {
      return rotatedPiece
    }
    
    // Try wall kicks for I-piece and other pieces
    const kicks = piece.type === 'I' ? 
      [[-2, 0], [1, 0], [-2, -1], [1, 2]] : // I-piece kicks
      [[-1, 0], [1, 0], [0, -1], [-1, -1], [1, -1]] // Standard kicks
    
    for (const [dx, dy] of kicks) {
      if (isValidPosition(rotatedPiece, board, dx, dy)) {
        return {
          ...rotatedPiece,
          x: rotatedPiece.x + dx,
          y: rotatedPiece.y + dy
        }
      }
    }
    
    return null
  }, [getRotatedPiece, isValidPosition])

  // Place piece on board
  const placePiece = useCallback((piece: JtrisPiece, board: number[][]): number[][] => {
    const newBoard = board.map(row => [...row])
    
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x]) {
          const boardY = piece.y + y
          const boardX = piece.x + x
          if (boardY >= 0) {
            newBoard[boardY][boardX] = piece.color + 1
          }
        }
      }
    }
    
    return newBoard
  }, [])

  // Clear completed lines and calculate attack
  const clearLines = useCallback((board: number[][]): { 
    newBoard: number[][], 
    linesCleared: number,
    attack: number,
    isTSpin: boolean
  } => {
    const completedLines: number[] = []
    
    for (let y = 0; y < BOARD_HEIGHT; y++) {
      if (board[y].every(cell => cell !== 0)) {
        completedLines.push(y)
      }
    }
    
    if (completedLines.length === 0) {
      return { newBoard: board, linesCleared: 0, attack: 0, isTSpin: false }
    }
    
    // Remove completed lines
    const newBoard = board.filter((_, index) => !completedLines.includes(index))
    
    // Add empty lines at top
    while (newBoard.length < BOARD_HEIGHT) {
      newBoard.unshift(Array(BOARD_WIDTH).fill(0))
    }
    
    // Calculate attack power
    const attackTable = [0, 0, 1, 2, 4] // 0, 1, 2, 3, 4+ lines
    const attack = attackTable[Math.min(completedLines.length, 4)]
    
    return {
      newBoard,
      linesCleared: completedLines.length,
      attack,
      isTSpin: false // T-spin detection would go here
    }
  }, [])

  // Hold current piece
  const holdPiece = useCallback(() => {
    setGameState(prev => {
      if (!prev.canHold || prev.isGameOver || prev.isPaused || !prev.currentPiece) {
        return prev
      }
      
      let newCurrentPiece: JtrisPiece
      let newNextPieces = prev.nextPieces
      let newHoldPiece = createPiece(prev.currentPiece.type)
      
      if (prev.holdPiece) {
        // Swap current and hold pieces
        newCurrentPiece = createPiece(prev.holdPiece.type)
      } else {
        // Take from next queue
        newCurrentPiece = prev.nextPieces[0]
        newNextPieces = fillNextQueue(prev.nextPieces.slice(1))
      }
      
      return {
        ...prev,
        currentPiece: newCurrentPiece,
        nextPieces: newNextPieces,
        holdPiece: newHoldPiece,
        canHold: false,
        lastAction: 'hold'
      }
    })
  }, [createPiece, fillNextQueue])

  // Update game statistics
  const updateStats = useCallback((linesCleared: number, attack: number, totalPieces: number) => {
    const currentTime = Date.now()
    const gameTime = (currentTime - gameStartTimeRef.current) / 1000
    
    setGameStats(prev => {
      const newPPS = totalPieces > 0 ? totalPieces / Math.max(gameTime, 1) : 0
      const newKPP = totalPieces > 0 ? keysPressed / totalPieces : 0
      const newFinesse = totalFinesse > 0 ? (perfectFinesse / totalFinesse) * 100 : 0
      
      return {
        ...prev,
        gameTime,
        attack: prev.attack + attack,
        finesse: newFinesse,
        pps: newPPS,
        kpp: newKPP,
        totalPieces
      }
    })
  }, [keysPressed, perfectFinesse, totalFinesse])

  // Move piece left or right
  const movePiece = useCallback((direction: number) => {
    setGameState(prev => {
      if (!prev.currentPiece || prev.isGameOver || prev.isPaused) return prev
      
      if (isValidPosition(prev.currentPiece, prev.board, direction, 0)) {
        setKeysPressed(k => k + 1)
        return {
          ...prev,
          currentPiece: {
            ...prev.currentPiece,
            x: prev.currentPiece.x + direction
          },
          totalKeys: prev.totalKeys + 1,
          lastAction: direction > 0 ? 'moveRight' : 'moveLeft'
        }
      }
      
      return prev
    })
  }, [isValidPosition])

  // Soft drop (move down)
  const softDrop = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentPiece || prev.isGameOver || prev.isPaused) return prev
      
      if (isValidPosition(prev.currentPiece, prev.board, 0, 1)) {
        setKeysPressed(k => k + 1)
        return {
          ...prev,
          currentPiece: {
            ...prev.currentPiece,
            y: prev.currentPiece.y + 1
          },
          score: prev.score + 1,
          totalKeys: prev.totalKeys + 1,
          lastAction: 'softDrop'
        }
      }
      
      return prev
    })
  }, [isValidPosition])

  // Rotate piece
  const rotatePiece = useCallback((direction: number) => {
    setGameState(prev => {
      if (!prev.currentPiece || prev.isGameOver || prev.isPaused) return prev
      
      let rotatedPiece: JtrisPiece | null = null
      
      if (direction === 2) {
        // 180-degree rotation
        rotatedPiece = tryRotation(prev.currentPiece, 2, prev.board)
      } else {
        rotatedPiece = tryRotation(prev.currentPiece, direction, prev.board)
      }
      
      if (rotatedPiece) {
        setKeysPressed(k => k + 1)
        setTotalFinesse(f => f + 1)
        // Calculate if this was optimal finesse (simplified)
        const isOptimalMove = Math.random() > 0.3 // Placeholder for real finesse calculation
        if (isOptimalMove) {
          setPerfectFinesse(f => f + 1)
        }
        
        return {
          ...prev,
          currentPiece: rotatedPiece,
          totalKeys: prev.totalKeys + 1,
          lastAction: direction === -1 ? 'rotateLeft' : direction === 1 ? 'rotateRight' : 'rotate180'
        }
      }
      
      return prev
    })
  }, [tryRotation])

  // Hard drop
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
      
      // Place the piece
      const newBoard = placePiece(droppedPiece, prev.board)
      const { newBoard: clearedBoard, linesCleared, attack } = clearLines(newBoard)
      
      // Calculate score
      const lineScore = {
        0: 0,
        1: 100,
        2: 300,
        3: 500,
        4: 800
      }[linesCleared] || 0
      
      const newScore = prev.score + (lineScore * prev.level) + (dropDistance * 2)
      const newLines = prev.lines + linesCleared
      const newLevel = Math.floor(newLines / 10) + 1
      const newTotalPieces = prev.totalPieces + 1
      
      // Get next piece
      const newCurrentPiece = prev.nextPieces[0]
      const newNextPieces = fillNextQueue(prev.nextPieces.slice(1))
      
      // Check game over
      if (!isValidPosition(newCurrentPiece, clearedBoard)) {
        return {
          ...prev,
          board: clearedBoard,
          score: newScore,
          level: newLevel,
          lines: newLines,
          attack: prev.attack + attack,
          totalPieces: newTotalPieces,
          isGameOver: true,
          lastAction: 'hardDrop'
        }
      }
      
      // Update statistics
      updateStats(linesCleared, attack, newTotalPieces)
      
      return {
        ...prev,
        board: clearedBoard,
        currentPiece: newCurrentPiece,
        nextPieces: newNextPieces,
        canHold: true,
        score: newScore,
        level: newLevel,
        lines: newLines,
        attack: prev.attack + attack,
        totalPieces: newTotalPieces,
        totalKeys: prev.totalKeys + 1,
        lastAction: 'hardDrop'
      }
    })
    
    setKeysPressed(k => k + 1)
  }, [isValidPosition, placePiece, clearLines, fillNextQueue, updateStats])

  // Natural drop (gravity)
  const naturalDrop = useCallback(() => {
    setGameState(prev => {
      if (!prev.currentPiece || prev.isGameOver || prev.isPaused) return prev
      
      if (isValidPosition(prev.currentPiece, prev.board, 0, 1)) {
        return {
          ...prev,
          currentPiece: {
            ...prev.currentPiece,
            y: prev.currentPiece.y + 1
          }
        }
      } else {
        // Piece has landed - place it
        const newBoard = placePiece(prev.currentPiece, prev.board)
        const { newBoard: clearedBoard, linesCleared, attack } = clearLines(newBoard)
        
        // Calculate score
        const lineScore = {
          0: 0,
          1: 100,
          2: 300,
          3: 500,
          4: 800
        }[linesCleared] || 0
        
        const newScore = prev.score + (lineScore * prev.level)
        const newLines = prev.lines + linesCleared
        const newLevel = Math.floor(newLines / 10) + 1
        const newTotalPieces = prev.totalPieces + 1
        
        // Get next piece
        const newCurrentPiece = prev.nextPieces[0]
        const newNextPieces = fillNextQueue(prev.nextPieces.slice(1))
        
        // Check game over
        if (!isValidPosition(newCurrentPiece, clearedBoard)) {
          updateStats(linesCleared, attack, newTotalPieces)
          return {
            ...prev,
            board: clearedBoard,
            score: newScore,
            level: newLevel,
            lines: newLines,
            attack: prev.attack + attack,
            totalPieces: newTotalPieces,
            isGameOver: true
          }
        }
        
        // Update statistics
        updateStats(linesCleared, attack, newTotalPieces)
        
        return {
          ...prev,
          board: clearedBoard,
          currentPiece: newCurrentPiece,
          nextPieces: newNextPieces,
          canHold: true,
          score: newScore,
          level: newLevel,
          lines: newLines,
          attack: prev.attack + attack,
          totalPieces: newTotalPieces
        }
      }
    })
  }, [isValidPosition, placePiece, clearLines, fillNextQueue, updateStats])

  // Format time display
  const formatTime = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const centiseconds = Math.floor((seconds % 1) * 100)
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centiseconds.toString().padStart(2, '0')}`
  }, [])

  // Handle key press for game controls
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (gameState.isGameOver || gameState.isPaused) return
    
    e.preventDefault()
    
    switch (e.key) {
      case keySettings.moveLeft:
        movePiece(-1)
        break
      case keySettings.moveRight:
        movePiece(1)
        break
      case keySettings.softDrop:
        softDrop()
        break
      case keySettings.hardDrop:
        hardDrop()
        break
      case keySettings.rotateLeft:
        rotatePiece(-1)
        break
      case keySettings.rotateRight:
        rotatePiece(1)
        break
      case keySettings.rotate180:
        rotatePiece(2)
        break
      case keySettings.hold:
        holdPiece()
        break
      case 'p': // Pause
        setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }))
        break
    }
  }, [gameState.isGameOver, gameState.isPaused, keySettings, movePiece, softDrop, hardDrop, rotatePiece, holdPiece])

  // Settings management
  const handleKeyChange = useCallback((action: string, newKey: string) => {
    setKeySettings(prev => ({ ...prev, [action]: newKey }))
  }, [])

  const startKeyRecord = useCallback((action: string) => {
    setIsRecordingKey(action)
  }, [])

  const handleKeyRecord = useCallback((e: KeyboardEvent) => {
    if (isRecordingKey) {
      e.preventDefault()
      const key = e.key === ' ' ? ' ' : e.key
      handleKeyChange(isRecordingKey, key)
      setIsRecordingKey(null)
    }
  }, [isRecordingKey, handleKeyChange])

  const changeSkin = useCallback((skinId: string) => {
    setSelectedSkin(skinId)
  }, [])

  // Get current skin colors
  const getCurrentSkin = useCallback((): BlockSkin => {
    return BLOCK_SKINS.find(skin => skin.id === selectedSkin) || BLOCK_SKINS[0]
  }, [selectedSkin])

  // Multiplayer Functions
  const loadAvailableMembers = useCallback(async () => {
    try {
      const response = await fetch('/api/members')
      const data = await response.json()
      if (data.success) {
        // Filter to only show the 6 rangu.fam members
        const rangufamMembers = data.members.filter((member: Member) => 
          ['member1', 'member2', 'member3', 'member4', 'member5', 'member6'].includes(member.id)
        )
        setAvailableMembers(rangufamMembers)
      }
    } catch (error) {
      console.error('Failed to load members:', error)
    }
  }, [])

  const createGameSession = useCallback(async () => {
    if (!user) return
    
    try {
      const response = await fetch('/api/games/tetris/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: user.id,
          hostName: user.username || user.memberId
        })
      })
      
      const data = await response.json()
      if (data.success) {
        setCurrentGameSession(data.session)
        setGameInviteLink(data.inviteLink)
        setGameMode('multiplayer')
        setShowGameLobby(true)
      }
    } catch (error) {
      console.error('Failed to create game session:', error)
    }
  }, [user])

  const inviteMember = useCallback(async (memberId: string) => {
    if (!currentGameSession || !user) return
    
    try {
      const response = await fetch('/api/games/tetris/invite', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: currentGameSession.gameId,
          hostId: user.id,
          invitedMemberId: memberId
        })
      })
      
      const data = await response.json()
      if (data.success) {
        // Show success notification
        console.log(`Invitation sent to member ${memberId}`)
      }
    } catch (error) {
      console.error('Failed to send invitation:', error)
    }
  }, [currentGameSession, user])

  const startBotGame = useCallback((botId: string) => {
    const selectedBot = botOpponents.find(bot => bot.id === botId)
    if (selectedBot) {
      setOpponent(selectedBot)
      setGameMode('bot')
      initGame() // Reset game state for both players
      
      // Initialize bot's game state
      const botGameState = {
        ...gameState,
        totalPieces: 0,
        score: 0,
        lines: 0,
        level: 1,
        gameTime: 0
      }
      setOpponent(prev => prev ? { ...prev, gameState: botGameState } : null)
    }
  }, [botOpponents, gameState, initGame])

  const copyInviteLink = useCallback(() => {
    if (gameInviteLink) {
      navigator.clipboard.writeText(gameInviteLink)
      // Show copied notification
      const notification = document.createElement('div')
      notification.className = 'fixed top-20 right-4 bg-green-500 text-white px-4 py-2 rounded-lg z-50'
      notification.textContent = '초대 링크가 복사되었습니다!'
      document.body.appendChild(notification)
      setTimeout(() => notification.remove(), 2000)
    }
  }, [gameInviteLink])

  // Bot AI Logic
  const updateBotGameState = useCallback(() => {
    if (gameMode !== 'bot' || !opponent || opponent.isBot !== true) return
    
    const bot = opponent as BotOpponent
    const difficulty = bot.difficulty
    
    // Simulate bot gameplay based on difficulty
    const botSpeed = {
      easy: 0.3,
      medium: 0.6, 
      hard: 0.9,
      extreme: 1.2
    }[difficulty]
    
    const botAccuracy = {
      easy: 0.4,
      medium: 0.7,
      hard: 0.9,
      extreme: 0.95
    }[difficulty]
    
    // Update bot's game state to simulate realistic gameplay
    setOpponent(prev => {
      if (!prev || !prev.gameState) return prev
      
      const timeRatio = gameState.gameTime / Math.max(prev.gameState.gameTime, 1)
      const performanceMultiplier = botSpeed * (0.8 + Math.random() * 0.4) // Add some variance
      
      return {
        ...prev,
        gameState: {
          ...prev.gameState,
          score: Math.floor(gameState.score * performanceMultiplier * botAccuracy),
          lines: Math.floor(gameState.lines * performanceMultiplier),
          level: Math.min(prev.gameState.level + Math.floor(prev.gameState.lines / 10), gameState.level + 1),
          totalPieces: Math.floor(gameState.totalPieces * performanceMultiplier),
          gameTime: gameState.gameTime,
          attack: Math.floor(gameState.attack * performanceMultiplier * botAccuracy),
          pps: performanceMultiplier * 2,
          kpp: 3 - (botAccuracy * 1.5),
          finesse: botAccuracy * 100
        }
      }
    })
  }, [gameMode, opponent, gameState])

  // Real-time sync for multiplayer (WebSocket would be ideal, polling for now)
  const syncMultiplayerState = useCallback(async () => {
    if (gameMode !== 'multiplayer' || !currentGameSession) return
    
    try {
      const response = await fetch(`/api/games/tetris/sessions/${currentGameSession.gameId}`)
      const data = await response.json()
      
      if (data.success) {
        setCurrentGameSession(data.session)
        // Update opponent state if available
        const opponentPlayer = data.session.players.find((p: PlayerData) => p.id !== user?.id)
        if (opponentPlayer) {
          setOpponent(opponentPlayer)
        }
      }
    } catch (error) {
      console.error('Failed to sync multiplayer state:', error)
    }
  }, [gameMode, currentGameSession, user])

  // Game loop for timing updates
  const updateGameTime = useCallback(() => {
    if (!gameState.isGameOver && !gameState.isPaused && gameStartTimeRef.current > 0) {
      const currentTime = Date.now()
      const elapsedSeconds = (currentTime - gameStartTimeRef.current) / 1000
      
      setGameState(prev => ({
        ...prev,
        gameTime: elapsedSeconds
      }))
    }
  }, [gameState.isGameOver, gameState.isPaused])

  // Effects
  useEffect(() => {
    initGame()
    loadAvailableMembers()
  }, [initGame, loadAvailableMembers])

  useEffect(() => {
    const interval = setInterval(updateGameTime, 100) // Update every 100ms
    return () => clearInterval(interval)
  }, [updateGameTime])

  // Bot AI update loop
  useEffect(() => {
    if (gameMode === 'bot' && !gameState.isGameOver && !gameState.isPaused) {
      const interval = setInterval(updateBotGameState, 200)
      return () => clearInterval(interval)
    }
  }, [gameMode, gameState.isGameOver, gameState.isPaused, updateBotGameState])

  // Multiplayer sync loop
  useEffect(() => {
    if (gameMode === 'multiplayer' && currentGameSession) {
      const interval = setInterval(syncMultiplayerState, 1000) // Sync every second
      return () => clearInterval(interval)
    }
  }, [gameMode, currentGameSession, syncMultiplayerState])

  // Game drop timer
  useEffect(() => {
    if (gameState.isGameOver || gameState.isPaused || !dropTime) return
    
    const interval = setInterval(() => {
      naturalDrop()
    }, dropTime)
    
    return () => clearInterval(interval)
  }, [naturalDrop, dropTime, gameState.isGameOver, gameState.isPaused])

  // Adjust drop speed based on level
  useEffect(() => {
    const newDropTime = Math.max(50, 1000 - (gameState.level - 1) * 100)
    setDropTime(newDropTime)
  }, [gameState.level])

  // Keyboard event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isRecordingKey) {
        handleKeyRecord(e)
        return
      }
      handleKeyPress(e)
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyPress, handleKeyRecord, isRecordingKey])

  // Rendering functions
  const renderBoard = useCallback((): number[][] => {
    const displayBoard = gameState.board.map(row => [...row])
    
    // Draw current piece
    if (gameState.currentPiece) {
      for (let y = 0; y < gameState.currentPiece.shape.length; y++) {
        for (let x = 0; x < gameState.currentPiece.shape[y].length; x++) {
          if (gameState.currentPiece.shape[y][x]) {
            const boardY = gameState.currentPiece.y + y
            const boardX = gameState.currentPiece.x + x
            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              displayBoard[boardY][boardX] = gameState.currentPiece.color + 1
            }
          }
        }
      }
    }
    
    return displayBoard
  }, [gameState.board, gameState.currentPiece])

  const renderPiece = useCallback((piece: JtrisPiece | null, size = 4) => {
    if (!piece) return null
    
    const currentSkin = getCurrentSkin()
    
    return (
      <div className={`grid gap-1`} style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {Array(size).fill(null).map((_, y) =>
          Array(size).fill(null).map((_, x) => {
            const pieceY = y
            const pieceX = x
            const isActive = piece.shape[pieceY] && piece.shape[pieceY][pieceX]
            
            return (
              <div
                key={`${y}-${x}`}
                className={`w-3 h-3 border border-gray-300 rounded-sm ${
                  isActive ? '' : 'bg-gray-100'
                }`}
                style={{
                  backgroundColor: isActive ? currentSkin.colors[piece.color] : undefined,
                  background: isActive && currentSkin.style === 'gradient' ?
                    `linear-gradient(135deg, ${currentSkin.colors[piece.color]}, ${currentSkin.colors[piece.color]}aa)` :
                    undefined
                }}
              />
            )
          })
        )}
      </div>
    )
  }, [getCurrentSkin])

  // Get current skin colors for rendering
  const currentSkin = getCurrentSkin()

  // Render opponent's game board (smaller version)
  const renderOpponentBoard = useCallback(() => {
    if (!opponent || !opponent.gameState) return null
    
    const opponentBoard = opponent.gameState.board
    
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{opponent.isBot ? (opponent as BotOpponent).avatar : '👤'}</span>
            <div>
              <p className="font-bold text-sm">
                {opponent.isBot ? (opponent as BotOpponent).name : (opponent as PlayerData).username}
              </p>
              {opponent.isBot && (
                <p className="text-xs text-gray-500 capitalize">
                  {(opponent as BotOpponent).difficulty}
                </p>
              )}
            </div>
          </div>
          
          {/* Real-time connection indicator */}
          {!opponent.isBot && (
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-gray-500">Live</span>
            </div>
          )}
        </div>
        
        {/* Mini game board */}
        <div 
          className="grid gap-px bg-gray-700 p-1 rounded shadow-lg"
          style={{ gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)` }}
        >
          {opponentBoard.map((row, y) =>
            row.map((cell, x) => {
              const cellColor = cell ? currentSkin.colors[cell - 1] : '#2a2a2a'
              return (
                <div
                  key={`opp-${y}-${x}`}
                  className="w-2 h-2 rounded-sm"
                  style={{
                    backgroundColor: cellColor,
                    opacity: cell ? 0.9 : 0.3
                  }}
                />
              )
            })
          )}
        </div>
        
        {/* Opponent stats */}
        <div className="text-xs space-y-1 bg-gray-50 p-2 rounded">
          <div className="flex justify-between">
            <span>Score:</span>
            <span className="font-bold">{opponent.gameState.score.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Lines:</span>
            <span className="font-bold">{opponent.gameState.lines}</span>
          </div>
          <div className="flex justify-between">
            <span>Level:</span>
            <span className="font-bold">{opponent.gameState.level}</span>
          </div>
          {opponent.gameState.pps !== undefined && (
            <div className="flex justify-between">
              <span>PPS:</span>
              <span className="font-bold">{opponent.gameState.pps.toFixed(1)}</span>
            </div>
          )}
        </div>
      </div>
    )
  }, [opponent, currentSkin])

  // Game Lobby Modal Component
  const GameLobbyModal = () => (
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
        <h3 className="text-xl font-bold mb-4">🎮 멀티플레이어 로비</h3>
        
        <div className="space-y-4 mb-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-700 mb-2">게임 세션 생성됨</h4>
            <p className="text-sm text-gray-600 mb-3">
              친구들을 초대해서 실시간 테트리스 대전을 즐겨보세요!
            </p>
            
            {gameInviteLink && (
              <div className="space-y-2">
                <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded font-mono break-all">
                  {gameInviteLink}
                </div>
                <Button variant="primary" size="sm" onClick={copyInviteLink}>
                  📋 링크 복사
                </Button>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-700">멤버 직접 초대</h4>
            <Button 
              variant="ghost" 
              onClick={() => setShowMemberInvite(true)}
              className="w-full"
            >
              👥 랑구팸 멤버 초대하기
            </Button>
          </div>
          
          {currentGameSession && (
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-700">현재 플레이어</h4>
              <div className="space-y-1">
                {currentGameSession.players.map(player => (
                  <div key={player.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center space-x-2">
                      <span>{player.avatar || '👤'}</span>
                      <span className="font-medium">{player.username}</span>
                      {player.isHost && <span className="text-xs text-blue-600">호스트</span>}
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${player.isReady ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                      {player.isReady ? '준비됨' : '대기중'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          <Button variant="primary" onClick={() => setShowGameLobby(false)} className="flex-1">
            게임 시작
          </Button>
          <Button variant="ghost" onClick={() => {
            setShowGameLobby(false)
            setGameMode('single')
            setCurrentGameSession(null)
          }} className="flex-1">
            취소
          </Button>
        </div>
      </motion.div>
    </motion.div>
  )

  // Member Invitation Modal
  const MemberInviteModal = () => (
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
        <h3 className="text-xl font-bold mb-4">👥 멤버 초대</h3>
        
        <div className="space-y-3 mb-6">
          <p className="text-sm text-gray-600">테트리스 대전에 초대할 랑구팸 멤버를 선택하세요</p>
          
          {availableMembers.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {availableMembers.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <span className="text-2xl">{member.avatar || '👤'}</span>
                      <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${member.isOnline ? 'bg-green-400' : 'bg-gray-400'}`}></span>
                    </div>
                    <div>
                      <p className="font-medium">{member.username}</p>
                      <p className="text-xs text-gray-500">{member.isOnline ? '온라인' : '오프라인'}</p>
                    </div>
                  </div>
                  <Button
                    variant={member.isOnline ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => inviteMember(member.id)}
                    disabled={!member.isOnline}
                  >
                    초대
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>사용 가능한 멤버가 없습니다</p>
            </div>
          )}
        </div>

        <Button variant="ghost" onClick={() => setShowMemberInvite(false)} className="w-full">
          닫기
        </Button>
      </motion.div>
    </motion.div>
  )

  // Bot Selection Modal
  const BotSelectionModal = () => (
    <motion.div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-white rounded-lg p-6 max-w-lg w-full mx-4"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
      >
        <h3 className="text-xl font-bold mb-4">🤖 봇 대전 선택</h3>
        
        <div className="space-y-3 mb-6">
          <p className="text-sm text-gray-600">대전할 봇을 선택하세요</p>
          
          <div className="grid gap-3">
            {botOpponents.map(bot => (
              <motion.div
                key={bot.id}
                className="p-4 border-2 rounded-lg cursor-pointer hover:border-blue-300 transition-colors"
                onClick={() => {
                  startBotGame(bot.id)
                  setShowBotSelection(false)
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center space-x-3 mb-2">
                  <span className="text-3xl">{bot.avatar}</span>
                  <div className="flex-1">
                    <h4 className="font-bold">{bot.name}</h4>
                    <p className="text-sm text-gray-600 capitalize">
                      난이도: {bot.difficulty === 'easy' ? '쉬움' : 
                               bot.difficulty === 'medium' ? '보통' : 
                               bot.difficulty === 'hard' ? '어려움' : '극한'}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">{bot.personality}</p>
              </motion.div>
            ))}
          </div>
        </div>

        <Button variant="ghost" onClick={() => setShowBotSelection(false)} className="w-full">
          취소
        </Button>
      </motion.div>
    </motion.div>
  )

  // Settings Modal Component
  const SettingsModal = () => {
    const actionLabels: { [key: string]: string } = {
      moveLeft: '왼쪽으로 이동',
      moveRight: '오른쪽으로 이동', 
      softDrop: '소프트드랍',
      hardDrop: '하드드랍',
      rotateLeft: '왼쪽으로 회전',
      rotateRight: '오른쪽으로 회전',
      rotate180: '180도 회전',
      hold: '홀드'
    }

    return (
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-lg p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto"
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
        >
          <h3 className="text-xl font-bold mb-4">게임 설정</h3>
          
          {/* Tab Navigation */}
          <div className="flex space-x-2 mb-4">
            <Button
              variant={settingsTab === 'controls' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSettingsTab('controls')}
            >
              컨트롤
            </Button>
            <Button
              variant={settingsTab === 'skins' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSettingsTab('skins')}
            >
              스킨
            </Button>
          </div>

          {/* Controls Tab */}
          {settingsTab === 'controls' && (
            <div className="space-y-4 mb-6">
              <h4 className="font-semibold">키 설정</h4>
              {Object.entries(keySettings).map(([action, key]) => (
                <div key={action} className="flex items-center justify-between">
                  <span className="text-sm">{actionLabels[action] || action}:</span>
                  <Button
                    variant={isRecordingKey === action ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => startKeyRecord(action)}
                    className="min-w-24"
                  >
                    {isRecordingKey === action ? '키를 눌러주세요...' : 
                     key === ' ' ? 'Space' : key.toUpperCase()}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Skins Tab */}
          {settingsTab === 'skins' && (
            <div className="space-y-4 mb-6">
              <h4 className="font-semibold">블록 스킨</h4>
              <div className="grid grid-cols-1 gap-3">
                {BLOCK_SKINS.map(skin => (
                  <div
                    key={skin.id}
                    className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedSkin === skin.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => changeSkin(skin.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{skin.name}</span>
                      {selectedSkin === skin.id && <span className="text-blue-500">✓</span>}
                    </div>
                    <div className="flex space-x-1">
                      {skin.colors.map((color, idx) => (
                        <div
                          key={idx}
                          className="w-4 h-4 rounded border"
                          style={{
                            backgroundColor: color,
                            background: skin.style === 'gradient' ? 
                              `linear-gradient(135deg, ${color}, ${color}aa)` : color
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex space-x-2">
            <Button variant="primary" onClick={() => setShowSettings(false)} className="flex-1">
              확인
            </Button>
          </div>
        </motion.div>
      </motion.div>
    )
  }

  const displayBoard = renderBoard()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
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
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-gradient">Jtris 테트리스</h1>
              
              {/* Game Mode Indicator */}
              {gameMode !== 'single' && (
                <div className="flex items-center space-x-2 px-3 py-1 bg-blue-100 rounded-full">
                  {gameMode === 'bot' ? (
                    <>
                      <Bot className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-600">봇 대전</span>
                    </>
                  ) : (
                    <>
                      <User className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-600">라이브 대전</span>
                    </>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Multiplayer Actions */}
              {gameMode === 'single' && (
                <>
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={() => setShowBotSelection(true)}
                    className="hidden sm:flex"
                  >
                    <Bot className="w-4 h-4 mr-1" />
                    봇 대전
                  </Button>
                  <Button
                    variant="glass"
                    size="sm"
                    onClick={createGameSession}
                    className="hidden sm:flex"
                  >
                    <User className="w-4 h-4 mr-1" />
                    친구 초대
                  </Button>
                </>
              )}
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
              
              {/* Exit Multiplayer */}
              {gameMode !== 'single' && (
                <Button
                  variant="glass"
                  size="sm"
                  onClick={() => {
                    setGameMode('single')
                    setOpponent(null)
                    setCurrentGameSession(null)
                    initGame()
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  나가기
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 pb-12">
        <div className="max-w-7xl mx-auto p-6">
          {/* Mobile Multiplayer Action Buttons */}
          {gameMode === 'single' && (
            <div className="sm:hidden mb-4 flex space-x-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowBotSelection(true)}
                className="flex-1"
              >
                <Bot className="w-4 h-4 mr-1" />
                봇 대전
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={createGameSession}
                className="flex-1"
              >
                <User className="w-4 h-4 mr-1" />
                친구 초대
              </Button>
            </div>
          )}
          
          <div className={`grid gap-6 ${
            gameMode === 'single' 
              ? 'grid-cols-1 xl:grid-cols-5' 
              : 'grid-cols-1 lg:grid-cols-4'
          }`}>
            
            {/* Left Sidebar - Hold & Next */}
            <div className={`space-y-4 ${
              gameMode === 'single' ? 'xl:col-span-1' : 'lg:col-span-1'
            }`}>
              {/* Hold Piece */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="p-4">
                  <h3 className="text-sm font-bold mb-3 text-gray-700">HOLD</h3>
                  <div className="flex justify-center">
                    {renderPiece(gameState.holdPiece)}
                  </div>
                </Card>
              </motion.div>

              {/* Next Pieces */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="p-4">
                  <h3 className="text-sm font-bold mb-3 text-gray-700">NEXT</h3>
                  <div className="space-y-3">
                    {gameState.nextPieces.slice(0, 5).map((piece, index) => (
                      <div key={index} className="flex justify-center">
                        {renderPiece(piece, 3)}
                      </div>
                    ))}
                  </div>
                </Card>
              </motion.div>
            </div>

            {/* Game Board */}
            <div className={`flex justify-center ${
              gameMode === 'single' ? 'xl:col-span-2' : 'lg:col-span-2'
            }`}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <Card className="p-4">
                  <div className="relative">
                    <div 
                      className="grid gap-px bg-gray-800 p-2 rounded-lg shadow-2xl"
                      style={{ gridTemplateColumns: `repeat(${BOARD_WIDTH}, 1fr)` }}
                    >
                      {displayBoard.map((row, y) =>
                        row.map((cell, x) => {
                          const cellColor = cell ? currentSkin.colors[cell - 1] : '#1a1a1a'
                          return (
                            <div
                              key={`${y}-${x}`}
                              className="w-7 h-7 border border-gray-600 rounded-sm"
                              style={{
                                backgroundColor: cellColor,
                                background: cell && currentSkin.style === 'gradient' ?
                                  `linear-gradient(135deg, ${cellColor}, ${cellColor}cc)` :
                                  cellColor,
                                boxShadow: cell ? 'inset 0 1px 2px rgba(255,255,255,0.2)' : 'none'
                              }}
                            />
                          )
                        })
                      )}
                    </div>

                    {/* Game Over Overlay */}
                    {gameState.isGameOver && (
                      <motion.div
                        className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center rounded-lg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="text-center text-white p-6">
                          <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
                          <h2 className="text-3xl font-bold mb-4">게임 종료!</h2>
                          <div className="space-y-2 mb-6">
                            <p className="text-xl">최종 점수: <span className="text-yellow-400">{gameState.score.toLocaleString()}</span></p>
                            <p>라인: {gameState.lines} | 레벨: {gameState.level}</p>
                            <p>플레이 시간: {formatTime(gameState.gameTime)}</p>
                          </div>
                          <Button variant="primary" onClick={initGame}>
                            다시 시작
                          </Button>
                        </div>
                      </motion.div>
                    )}

                    {/* Pause Overlay */}
                    {gameState.isPaused && !gameState.isGameOver && (
                      <motion.div
                        className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center rounded-lg"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="text-center text-white">
                          <Pause className="w-16 h-16 mx-auto mb-4" />
                          <h2 className="text-2xl font-bold">일시정지</h2>
                          <p className="mt-2 text-sm opacity-75">P 키로 게임을 재개하세요</p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </Card>

                {/* Game Stats Below Board */}
                <motion.div
                  className="mt-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="p-4 bg-gray-900 text-white">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">라운드 시간</p>
                        <p className="font-mono text-lg font-bold text-blue-400">
                          {formatTime(gameState.gameTime)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">점수</p>
                        <p className="font-mono text-lg font-bold text-green-400">
                          {gameState.score.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">공격</p>
                        <p className="font-mono text-lg font-bold text-red-400">
                          {gameState.attack}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">피네스</p>
                        <p className="font-mono text-lg font-bold text-purple-400">
                          {gameStats.finesse.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">PPS</p>
                        <p className="font-mono text-lg font-bold text-yellow-400">
                          {gameStats.pps.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">KPP</p>
                        <p className="font-mono text-lg font-bold text-cyan-400">
                          {gameStats.kpp.toFixed(1)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 text-center">
                      <p className="text-gray-400 text-xs">
                        # {gameState.totalPieces}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              </motion.div>
            </div>

            {/* Opponent Screen (Multiplayer/Bot Mode Only) */}
            {(gameMode === 'multiplayer' || gameMode === 'bot') && opponent && (
              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5 }}
                >
                  <Card className="p-4 border-2 border-blue-200">
                    <h3 className="text-lg font-bold mb-3 text-center">
                      {gameMode === 'bot' ? '🤖 상대방' : '🎯 라이브 대전 상대'}
                    </h3>
                    {renderOpponentBoard()}
                  </Card>
                </motion.div>
              </div>
            )}

            {/* Right Sidebar - Stats & Controls */}
            <div className={`space-y-4 ${
              gameMode === 'single' 
                ? 'xl:col-span-2' 
                : (opponent ? 'hidden lg:block' : 'lg:col-span-1')
            }`}>
              
              {/* Game Info */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="p-4">
                  <h3 className="text-lg font-bold mb-4 flex items-center">
                    <Target className="w-5 h-5 mr-2 text-blue-600" />
                    게임 정보
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-blue-50 rounded">
                      <p className="text-sm text-gray-600">레벨</p>
                      <p className="text-2xl font-bold text-blue-600">{gameState.level}</p>
                    </div>
                    <div className="text-center p-3 bg-green-50 rounded">
                      <p className="text-sm text-gray-600">라인</p>
                      <p className="text-2xl font-bold text-green-600">{gameState.lines}</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded">
                      <p className="text-sm text-gray-600">총 키 입력</p>
                      <p className="text-xl font-bold text-purple-600">{gameState.totalKeys}</p>
                    </div>
                    <div className="text-center p-3 bg-orange-50 rounded">
                      <p className="text-sm text-gray-600">총 블록</p>
                      <p className="text-xl font-bold text-orange-600">{gameState.totalPieces}</p>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Controls Guide */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="p-4">
                  <h3 className="text-lg font-bold mb-4">컨트롤</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span>왼쪽으로 이동:</span>
                      <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">
                        {keySettings.moveLeft === 'ArrowLeft' ? '←' : keySettings.moveLeft.toUpperCase()}
                      </kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>오른쪽으로 이동:</span>
                      <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">
                        {keySettings.moveRight === 'ArrowRight' ? '→' : keySettings.moveRight.toUpperCase()}
                      </kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>소프트드랍:</span>
                      <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">
                        {keySettings.softDrop === 'ArrowDown' ? '↓' : keySettings.softDrop.toUpperCase()}
                      </kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>하드드랍:</span>
                      <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">
                        {keySettings.hardDrop === ' ' ? 'Space' : keySettings.hardDrop.toUpperCase()}
                      </kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>왼쪽으로 회전:</span>
                      <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">
                        {keySettings.rotateLeft.toUpperCase()}
                      </kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>오른쪽으로 회전:</span>
                      <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">
                        {keySettings.rotateRight.toUpperCase()}
                      </kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>180도 회전:</span>
                      <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">
                        {keySettings.rotate180.toUpperCase()}
                      </kbd>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>홀드:</span>
                      <kbd className="px-2 py-1 bg-gray-200 rounded text-xs font-mono">
                        {keySettings.hold.toUpperCase()}
                      </kbd>
                    </div>
                  </div>
                </Card>
              </motion.div>

              {/* Current Skin Preview */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="p-4">
                  <h3 className="text-lg font-bold mb-3">스킨</h3>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{currentSkin.name}</span>
                    <div className="flex space-x-1">
                      {currentSkin.colors.map((color, idx) => (
                        <div
                          key={idx}
                          className="w-4 h-4 rounded border border-gray-300"
                          style={{
                            backgroundColor: color,
                            background: currentSkin.style === 'gradient' ? 
                              `linear-gradient(135deg, ${color}, ${color}aa)` : color
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && <SettingsModal />}
      
      {/* Multiplayer Modals */}
      {showGameLobby && <GameLobbyModal />}
      {showMemberInvite && <MemberInviteModal />}
      {showBotSelection && <BotSelectionModal />}
    </div>
  )
} 