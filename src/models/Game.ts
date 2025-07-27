import mongoose from 'mongoose'

// 게임 점수 스키마
const GameScoreSchema = new mongoose.Schema({
  playerId: { type: String, required: true },
  playerName: { type: String, required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  gameType: { 
    type: String, 
    enum: ['tetris', 'wordchain', 'cardgame', 'snake', 'pong', 'puzzle'],
    required: true 
  },
  score: { type: Number, required: true, min: 0 },
  level: { type: Number, default: 1 },
  duration: { type: Number, required: true }, // 게임 플레이 시간 (초)
  moves: { type: Number }, // 움직임/턴 수
  accuracy: { type: Number }, // 정확도 (%)
  combo: { type: Number }, // 최대 콤보
  difficulty: { 
    type: String, 
    enum: ['easy', 'normal', 'hard', 'expert'],
    default: 'normal'
  },
  
  // 게임별 세부 데이터
  gameData: {
    // Tetris 전용
    linesCleared: { type: Number },
    blocksPlaced: { type: Number },
    maxLevel: { type: Number },
    
    // Word Chain 전용
    wordsUsed: [{ type: String }],
    averageWordLength: { type: Number },
    longestWord: { type: String },
    
    // Card Game 전용
    handsWon: { type: Number },
    handsLost: { type: Number },
    bestHand: { type: String },
    
    // 공통
    powerUpsUsed: { type: Number },
    bonusPoints: { type: Number }
  },
  
  // 기록 관련
  isPersonalBest: { type: Boolean, default: false },
  isNewRecord: { type: Boolean, default: false },
  screenshot: { type: String }, // 스크린샷 URL
  replay: { type: String }, // 리플레이 데이터 URL
  
  // 검증
  isVerified: { type: Boolean, default: true },
  verifiedBy: { type: String },
  
  // 소셜
  likes: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  
  // 태그
  tags: [{ type: String }],
  isHighlight: { type: Boolean, default: false }
}, { timestamps: true })

// 게임 통계 스키마
const GameStatsSchema = new mongoose.Schema({
  playerId: { type: String, required: true },
  gameType: { type: String, required: true },
  
  // 기본 통계
  totalGames: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  totalTime: { type: Number, default: 0 }, // 총 플레이 시간 (초)
  averageScore: { type: Number, default: 0 },
  bestScore: { type: Number, default: 0 },
  bestScoreDate: { type: Date },
  
  // 상세 통계
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  draws: { type: Number, default: 0 },
  winRate: { type: Number, default: 0 },
  
  // 연속 기록
  currentStreak: { type: Number, default: 0 },
  bestStreak: { type: Number, default: 0 },
  
  // 레벨/등급
  level: { type: Number, default: 1 },
  experience: { type: Number, default: 0 },
  rank: { type: String, default: 'Bronze' },
  
  // 월별 통계
  monthlyStats: [{
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    games: { type: Number, default: 0 },
    score: { type: Number, default: 0 },
    time: { type: Number, default: 0 },
    bestScore: { type: Number, default: 0 }
  }],
  
  // 업적
  achievements: [{
    id: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },
    unlockedAt: { type: Date, default: Date.now },
    rarity: { type: String, enum: ['common', 'rare', 'epic', 'legendary'], default: 'common' }
  }]
}, { timestamps: true })

// 게임 토너먼트 스키마
const TournamentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  gameType: { type: String, required: true },
  
  // 참가자
  participants: [{
    playerId: { type: String, required: true },
    playerName: { type: String, required: true },
    registeredAt: { type: Date, default: Date.now },
    score: { type: Number, default: 0 },
    rank: { type: Number },
    isEliminated: { type: Boolean, default: false }
  }],
  
  // 일정
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  registrationDeadline: { type: Date },
  
  // 설정
  maxParticipants: { type: Number, default: 10 },
  entryFee: { type: Number, default: 0 },
  prizes: [{
    rank: { type: Number, required: true },
    prize: { type: String, required: true },
    amount: { type: Number }
  }],
  
  // 상태
  status: { 
    type: String, 
    enum: ['upcoming', 'registration', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  
  // 결과
  winner: {
    playerId: { type: String },
    playerName: { type: String },
    finalScore: { type: Number }
  },
  
  // 관리
  organizer: { type: String, required: true },
  rules: [{ type: String }],
  isPublic: { type: Boolean, default: true }
}, { timestamps: true })

// 인덱스 설정
GameScoreSchema.index({ playerId: 1, gameType: 1 })
GameScoreSchema.index({ gameType: 1, score: -1 })
GameScoreSchema.index({ createdAt: -1 })
GameScoreSchema.index({ isPersonalBest: 1 })
GameScoreSchema.index({ isNewRecord: 1 })

GameStatsSchema.index({ playerId: 1, gameType: 1 }, { unique: true })
GameStatsSchema.index({ gameType: 1, bestScore: -1 })

TournamentSchema.index({ gameType: 1 })
TournamentSchema.index({ status: 1 })
TournamentSchema.index({ startDate: 1 })

// 인터페이스 정의
export interface IGameScore extends mongoose.Document {
  playerId: string
  playerName: string
  userId?: mongoose.Types.ObjectId
  gameType: 'tetris' | 'wordchain' | 'cardgame' | 'snake' | 'pong' | 'puzzle'
  score: number
  level: number
  duration: number
  moves?: number
  accuracy?: number
  combo?: number
  difficulty: 'easy' | 'normal' | 'hard' | 'expert'
  gameData: {
    linesCleared?: number
    blocksPlaced?: number
    maxLevel?: number
    wordsUsed?: string[]
    averageWordLength?: number
    longestWord?: string
    handsWon?: number
    handsLost?: number
    bestHand?: string
    powerUpsUsed?: number
    bonusPoints?: number
  }
  isPersonalBest: boolean
  isNewRecord: boolean
  screenshot?: string
  replay?: string
  isVerified: boolean
  verifiedBy?: string
  likes: number
  likedBy: mongoose.Types.ObjectId[]
  comments: Array<{
    userId: mongoose.Types.ObjectId
    username: string
    content: string
    createdAt: Date
  }>
  tags: string[]
  isHighlight: boolean
  createdAt: Date
  updatedAt: Date
}

export interface IGameStats extends mongoose.Document {
  playerId: string
  gameType: string
  totalGames: number
  totalScore: number
  totalTime: number
  averageScore: number
  bestScore: number
  bestScoreDate?: Date
  wins: number
  losses: number
  draws: number
  winRate: number
  currentStreak: number
  bestStreak: number
  level: number
  experience: number
  rank: string
  monthlyStats: Array<{
    year: number
    month: number
    games: number
    score: number
    time: number
    bestScore: number
  }>
  achievements: Array<{
    id: string
    name: string
    description?: string
    unlockedAt: Date
    rarity: 'common' | 'rare' | 'epic' | 'legendary'
  }>
  createdAt: Date
  updatedAt: Date
}

const GameScore = mongoose.models.GameScore || mongoose.model<IGameScore>('GameScore', GameScoreSchema)
const GameStats = mongoose.models.GameStats || mongoose.model<IGameStats>('GameStats', GameStatsSchema)
const Tournament = mongoose.models.Tournament || mongoose.model('Tournament', TournamentSchema)

export { GameScore, GameStats, Tournament }
export default GameScore 