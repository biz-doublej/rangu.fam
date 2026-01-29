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
  discordId?: string
  avatar?: string
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

// 갤러리 관련 타입
export interface GalleryImage {
  id: string
  url: string
  title?: string
  description?: string
  uploadedBy?: string
  uploadDate: Date
  tags?: string[]
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
  type: 'link' | 'music' | 'weather' | 'custom'
  title: string
  content: any
  position: { x: number; y: number }
  size: { width: number; height: number }
  createdBy: string
  isVisible: boolean
}

// 개인 북마크 타입
export interface Bookmark {
  _id?: string
  userId: string
  title: string
  url: string
  description?: string
  icon?: string
  order: number
  createdAt: Date
  updatedAt: Date
} 
