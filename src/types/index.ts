// 사용자 및 멤버 타입 정의
export interface Member {
  id: string
  name: string
  role: string
  description: string
  avatar?: string
  email?: string
  status: 'active' | 'inactive'
  location?: string
  joinDate: Date
  personalPageUrl?: string
}

// 로그인 관련 타입
export interface User {
  id: string
  username: string
  email: string
  role: 'member' | 'guest'
  memberId?: string // member 역할일 경우 연결된 Member ID
  isLoggedIn: boolean
}

// 음악 관련 타입
export interface Track {
  id: string
  title: string
  artist: string
  album?: string
  duration: number
  audioUrl: string
  coverImage?: string
  uploadedBy: string
  uploadDate: Date
  genre?: string
}

export interface Playlist {
  id: string
  name: string
  description?: string
  tracks: Track[]
  createdBy: string
  createdDate: Date
  isPublic: boolean
}

// 위키 관련 타입 (나무위키 스타일)
export interface WikiPage {
  id: string
  title: string
  content: string
  lastModified: Date
  lastModifiedBy: string
  version: number
  isLocked: boolean
  tags: string[]
  category?: string
  viewCount: number
  revisions: WikiRevision[]
  discussions: WikiDiscussion[]
  slug: string
  isProtected: boolean
  tableOfContents: WikiTableOfContents[]
}

export interface WikiRevision {
  id: string
  pageId: string
  content: string
  author: string
  timestamp: Date
  summary: string
  isMinor: boolean
  size: number
  diff?: string
}

export interface WikiDiscussion {
  id: string
  pageId: string
  author: string
  authorName: string
  content: string
  timestamp: Date
  replies: WikiDiscussionReply[]
  isResolved: boolean
  topic: string
}

export interface WikiDiscussionReply {
  id: string
  discussionId: string
  author: string
  authorName: string
  content: string
  timestamp: Date
}

export interface WikiTableOfContents {
  id: string
  title: string
  level: number
  anchor: string
  children: WikiTableOfContents[]
}

export interface WikiSearchResult {
  id: string
  title: string
  snippet: string
  category: string
  score: number
  url: string
}

export interface WikiEdit {
  id: string
  pageId: string
  content: string
  summary: string
  editedBy: string
  editDate: Date
  version: number
}

export interface WikiLink {
  text: string
  href: string
  type: 'internal' | 'external'
  exists?: boolean
}

// 달력 관련 타입
export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startDate: Date
  endDate: Date
  allDay: boolean
  createdBy: string
  attendees: string[]
  location?: string
  color?: string
  isPrivate: boolean
}

// 갤러리 관련 타입
export interface GalleryImage {
  id: string
  url: string
  title?: string
  description?: string
  uploadedBy: string
  uploadDate: Date
  tags: string[]
  eventId?: string // 달력 이벤트와 연결
}

// 공통 응답 타입
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// 페이지네이션 타입
export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationInfo
}

// 시간대 정보
export interface TimeZoneInfo {
  label: string
  timeZone: string
  current: Date
}

// 슬라이드 이미지 타입
export interface SlideImage {
  id: string
  url: string
  title?: string
  description?: string
  order: number
}

// 위젯 타입
export interface Widget {
  id: string
  type: 'link' | 'calendar' | 'music' | 'weather' | 'custom'
  title: string
  content: any
  position: { x: number; y: number }
  size: { width: number; height: number }
  createdBy: string
  isVisible: boolean
}

// 게임 관련 타입
export interface GameScore {
  id: string
  playerId: string
  playerName: string
  score: number
  gameType: 'tetris' | 'wordchain' | 'cardgame'
  playedAt: Date
  duration?: number
}

export interface TetrisGameState {
  board: number[][]
  currentPiece: TetrisPiece | null
  nextPiece: TetrisPiece | null
  score: number
  level: number
  lines: number
  isGameOver: boolean
  isPaused: boolean
}

export interface TetrisPiece {
  shape: number[][]
  x: number
  y: number
  color: number
}

export interface WordChainGame {
  id: string
  players: string[]
  currentPlayer: string
  words: string[]
  usedWords: Set<string>
  isGameOver: boolean
  winner?: string
  currentWord?: string
}

export interface CardGame {
  id: string
  players: string[]
  deck: Card[]
  hands: { [playerId: string]: Card[] }
  currentPlayer: string
  discardPile: Card[]
  isGameOver: boolean
  winner?: string
}

export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades'
  rank: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K'
  value: number
}

// 게임 설정 관련 타입
export interface TetrisKeySettings {
  moveLeft: string
  moveRight: string
  softDrop: string
  hardDrop: string
  rotateLeft: string
  rotateRight: string
  rotate180: string
  hold: string
}

export interface BotSettings {
  tetris: {
    enabled: boolean
    difficulty: 'easy' | 'normal' | 'hard'
    speed: number
  }
  wordchain: {
    enabled: boolean
    difficulty: 'easy' | 'normal' | 'hard'
    responseTime: number
  }
  cardgame: {
    enabled: boolean
    difficulty: 'easy' | 'normal' | 'hard'
    strategy: 'aggressive' | 'defensive' | 'balanced'
  }
}

export interface GameSettings {
  userId: string
  tetrisKeys: TetrisKeySettings
  botSettings: BotSettings
  preferences: {
    soundEnabled: boolean
    animationsEnabled: boolean
    autoSave: boolean
  }
  createdAt: Date
  updatedAt: Date
} 