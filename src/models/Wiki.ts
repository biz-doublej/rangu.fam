import mongoose from 'mongoose'

// 위키 사용자 스키마 (메인 사용자와 별도)
const WikiUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  
  // 프로필 정보
  displayName: { type: String },
  avatar: { type: String },
  bio: { type: String },
  signature: { type: String }, // 서명
  discordId: { type: String, unique: true, sparse: true },
  discordUsername: { type: String },
  discordAvatar: { type: String },
  
  // 위키 권한
  role: { 
    type: String, 
    enum: ['viewer', 'editor', 'moderator', 'admin', 'owner'],
    default: 'editor'
  },
  permissions: {
    canEdit: { type: Boolean, default: true },
    canDelete: { type: Boolean, default: false },
    canProtect: { type: Boolean, default: false },
    canBan: { type: Boolean, default: false },
    canManageUsers: { type: Boolean, default: false }
  },
  
  // 통계
  edits: { type: Number, default: 0 },
  pagesCreated: { type: Number, default: 0 },
  discussionPosts: { type: Number, default: 0 },
  reputation: { type: Number, default: 0 },
  
  // 설정
  preferences: {
    theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'auto' },
    timezone: { type: String, default: 'Asia/Seoul' },
    emailNotifications: { type: Boolean, default: true },
    showEmail: { type: Boolean, default: false },
    autoWatchPages: { type: Boolean, default: true }
  },
  
  // 상태
  isActive: { type: Boolean, default: true },
  
  // 차단 정보
  banStatus: {
    isBanned: { type: Boolean, default: false },
    reason: { type: String },
    bannedBy: { type: String },
    bannedAt: { type: Date },
    bannedUntil: { type: Date },
    unbannedBy: { type: String },
    unbannedAt: { type: Date }
  },
  
  // 경고 기록
  warnings: [{
    reason: { type: String, required: true },
    warnedBy: { type: String, required: true },
    warnedAt: { type: Date, default: Date.now }
  }],
  
  // 활동 로그
  lastLogin: { type: Date },
  lastActivity: { type: Date },
  
  // 연결
  mainUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // 메인 사이트 사용자와 연결
}, { timestamps: true })

// 위키 문서 리비전 스키마
const WikiRevisionSchema = new mongoose.Schema({
  pageId: { type: mongoose.Schema.Types.ObjectId, ref: 'WikiPage', required: true },
  revisionNumber: { type: Number, required: true },
  content: { type: String, required: true },
  summary: { type: String }, // 편집 요약
  
  // 편집자 정보
  author: { type: String, required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'WikiUser' },
  authorIP: { type: String }, // 익명 편집의 경우
  
  // 편집 타입
  editType: { 
    type: String, 
    enum: ['create', 'edit', 'revert', 'redirect', 'protect', 'move'],
    default: 'edit'
  },
  isMinorEdit: { type: Boolean, default: false },
  isAutomated: { type: Boolean, default: false }, // 봇 편집
  
  // 콘텐츠 정보
  contentLength: { type: Number, required: true },
  sizeChange: { type: Number, default: 0 }, // 이전 리비전 대비 크기 변화
  
  // 상태
  isReverted: { type: Boolean, default: false },
  revertedBy: { type: String },
  revertReason: { type: String },
  
  // 검증
  isVerified: { type: Boolean, default: false },
  verifiedBy: { type: String },
  
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true })

// 위키 토론/논의 스키마
const WikiDiscussionSchema = new mongoose.Schema({
  pageId: { type: mongoose.Schema.Types.ObjectId, ref: 'WikiPage', required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  
  // 작성자
  author: { type: String, required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'WikiUser' },
  
  // 분류
  category: {
    type: String,
    enum: ['general', 'content', 'policy', 'technical', 'vandalism', 'dispute'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  
  // 상태
  status: {
    type: String,
    enum: ['open', 'resolved', 'closed', 'archived'],
    default: 'open'
  },
  
  // 답글들
  replies: [{
    id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId() },
    content: { type: String, required: true },
    author: { type: String, required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'WikiUser' },
    timestamp: { type: Date, default: Date.now },
    isDeleted: { type: Boolean, default: false },
    likes: { type: Number, default: 0 },
    likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'WikiUser' }]
  }],
  
  // 통계
  views: { type: Number, default: 0 },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'WikiUser' }],
  
  // 메타데이터
  tags: [{ type: String }],
  isLocked: { type: Boolean, default: false },
  lockedBy: { type: String },
  lockReason: { type: String }
}, { timestamps: true })

// 메인 위키 페이지 스키마
const WikiPageSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  namespace: { 
    type: String, 
    enum: ['main', 'user', 'project', 'template', 'help', 'category', 'file'],
    default: 'main'
  },
  
  // 현재 콘텐츠
  content: { type: String, default: '' },
  summary: { type: String }, // 문서 요약
  
  // 메타데이터
  categories: [{ type: String }],
  tags: [{ type: String }],
  aliases: [{ type: String }], // 리다이렉트 별명들
  
  // 작성자 정보
  creator: { type: String, required: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'WikiUser' },
  
  // 최근 편집자 정보
  lastEditor: { type: String },
  lastEditorId: { type: mongoose.Schema.Types.ObjectId, ref: 'WikiUser' },
  lastEditDate: { type: Date, default: Date.now },
  lastEditSummary: { type: String },
  
  // 리비전 관리
  currentRevision: { type: Number, default: 1 },
  revisions: [WikiRevisionSchema],
  
  // 보호 설정
  protection: {
    level: { 
      type: String, 
      enum: ['none', 'semi', 'full', 'admin'],
      default: 'none'
    },
    reason: { type: String },
    protectedBy: { type: String },
    protectedUntil: { type: Date },
    allowedRoles: [{ type: String }]
  },
  
  // 상태
  isRedirect: { type: Boolean, default: false },
  redirectTarget: { type: String },
  isDeleted: { type: Boolean, default: false },
  deletedBy: { type: String },
  deleteReason: { type: String },
  isStub: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  
  // 통계
  views: { type: Number, default: 0 },
  uniqueViews: { type: Number, default: 0 },
  edits: { type: Number, default: 0 },
  watchers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'WikiUser' }],
  
  // 토론
  discussions: [WikiDiscussionSchema],
  
  // 링크 관리
  incomingLinks: [{ type: String }], // 이 문서로 링크하는 문서들
  outgoingLinks: [{ type: String }], // 이 문서에서 링크하는 문서들
  
  // 목차 자동 생성
  tableOfContents: [{
    level: { type: Number, required: true },
    title: { type: String, required: true },
    anchor: { type: String, required: true }
  }],
  
  // 템플릿 정보 (템플릿 문서의 경우)
  templateInfo: {
    isTemplate: { type: Boolean, default: false },
    parameters: [{
      name: { type: String },
      description: { type: String },
      required: { type: Boolean, default: false },
      defaultValue: { type: String }
    }],
    usage: { type: String }
  },
  
  // 편집 잠금 (동시 편집 방지)
  editLock: {
    isLocked: { type: Boolean, default: false },
    lockedBy: { type: String }, // 편집 중인 사용자명
    lockedById: { type: mongoose.Schema.Types.ObjectId, ref: 'WikiUser' },
    lockStartTime: { type: Date },
    lockExpiry: { type: Date }, // 자동 해제 시간 (10분 후)
    lockReason: { type: String, default: 'editing' }
  }
}, { timestamps: true })

// 위키 네임스페이스 스키마
const WikiNamespaceSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  description: { type: String },
  prefix: { type: String, required: true },
  
  // 권한 설정
  permissions: {
    read: [{ type: String }], // 읽기 권한이 있는 역할들
    edit: [{ type: String }], // 편집 권한이 있는 역할들
    create: [{ type: String }], // 생성 권한이 있는 역할들
    delete: [{ type: String }] // 삭제 권한이 있는 역할들
  },
  
  // 설정
  allowSubpages: { type: Boolean, default: true },
  isContentNamespace: { type: Boolean, default: true },
  hasDiscussion: { type: Boolean, default: true },
  
  // 통계
  pageCount: { type: Number, default: 0 },
  
  isActive: { type: Boolean, default: true }
}, { timestamps: true })

// 위키 사이트 설정 스키마
const WikiConfigSchema = new mongoose.Schema({
  siteName: { type: String, default: '이랑위키' },
  siteDescription: { type: String, default: 'Rangu.fam의 지식 공유 공간' },
  siteUrl: { type: String },
  
  // 기본 설정
  defaultTheme: { type: String, default: 'light' },
  allowAnonymousEditing: { type: Boolean, default: false },
  requireEmailVerification: { type: Boolean, default: true },
  autoApproveEdits: { type: Boolean, default: true },
  
  // 편집 설정
  editConflictResolution: { 
    type: String, 
    enum: ['manual', 'auto', 'latest'],
    default: 'manual'
  },
  maxEditSummaryLength: { type: Number, default: 200 },
  warnOnLargeEdits: { type: Number, default: 5000 }, // 바이트
  
  // 보안 설정
  captchaThreshold: { type: Number, default: 3 }, // 연속 편집 실패 시 캡차
  rateLimitEdits: { type: Number, default: 10 }, // 분당 편집 횟수 제한
  ipBlockDuration: { type: Number, default: 24 }, // 시간
  
  // 알림 설정
  emailNotifications: {
    watchlistChanges: { type: Boolean, default: true },
    mentions: { type: Boolean, default: true },
    discussions: { type: Boolean, default: true }
  },
  
  // 검색 설정
  searchEngine: { 
    type: String, 
    enum: ['mongodb', 'elasticsearch'],
    default: 'mongodb'
  },
  indexCategories: { type: Boolean, default: true },
  indexDiscussions: { type: Boolean, default: true },
  
  // 백업 설정
  autoBackup: {
    enabled: { type: Boolean, default: true },
    frequency: { type: String, default: 'daily' },
    retention: { type: Number, default: 30 } // 일
  }
}, { timestamps: true })

// 편집/생성 승인 대기 스키마
const WikiSubmissionSchema = new mongoose.Schema({
  type: { type: String, enum: ['create', 'edit'], required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'onhold'], default: 'pending' },
  reason: { type: String },
  namespace: { type: String, default: 'main' },
  targetTitle: { type: String, required: true },
  targetSlug: { type: String, required: true },
  pageId: { type: mongoose.Schema.Types.ObjectId, ref: 'WikiPage' },
  content: { type: String, required: true },
  summary: { type: String },
  editSummary: { type: String },
  categories: [{ type: String }],
  tags: [{ type: String }],
  expectedRevision: { type: Number },
  author: { type: String, required: true },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'WikiUser', required: true },
  reviewedBy: { type: String },
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'WikiUser' },
  reviewedAt: { type: Date }
}, { timestamps: true })

// 인덱스 설정 (unique 필드는 자동으로 인덱스 생성됨)
// WikiUserSchema.index({ username: 1 }) - unique: true로 자동 생성됨
// WikiUserSchema.index({ email: 1 }) - unique: true로 자동 생성됨
WikiUserSchema.index({ role: 1 })
WikiUserSchema.index({ isActive: 1 })

// WikiPageSchema.index({ slug: 1 }) - unique: true로 자동 생성됨
WikiPageSchema.index({ title: 'text', content: 'text' })
WikiPageSchema.index({ namespace: 1 })
WikiPageSchema.index({ categories: 1 })
WikiPageSchema.index({ views: -1 })
WikiPageSchema.index({ lastEditDate: -1 })
WikiPageSchema.index({ 'protection.level': 1 })
WikiPageSchema.index({ 'editLock.isLocked': 1, 'editLock.lockExpiry': 1 })

WikiRevisionSchema.index({ pageId: 1, revisionNumber: -1 })
WikiRevisionSchema.index({ author: 1 })
WikiRevisionSchema.index({ timestamp: -1 })

WikiDiscussionSchema.index({ pageId: 1 })
WikiDiscussionSchema.index({ status: 1 })
WikiDiscussionSchema.index({ category: 1 })

WikiSubmissionSchema.index({ status: 1, createdAt: -1 })
WikiSubmissionSchema.index({ targetSlug: 1, status: 1 })

// 인터페이스 정의
export interface IWikiUser extends mongoose.Document {
  username: string
  email: string
  password: string
  displayName?: string
  avatar?: string
  bio?: string
  signature?: string
  discordId?: string
  discordUsername?: string
  discordAvatar?: string
  role: 'viewer' | 'editor' | 'moderator' | 'admin' | 'owner'
  permissions: {
    canEdit: boolean
    canDelete: boolean
    canProtect: boolean
    canBan: boolean
    canManageUsers: boolean
  }
  edits: number
  pagesCreated: number
  discussionPosts: number
  reputation: number
  preferences: {
    theme: 'light' | 'dark' | 'auto'
    timezone: string
    emailNotifications: boolean
    showEmail: boolean
    autoWatchPages: boolean
  }
  isActive: boolean
  isBanned: boolean
  banReason?: string
  banExpiry?: Date
  lastLogin?: Date
  lastActivity?: Date
  mainUserId?: mongoose.Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

export interface IWikiPage extends mongoose.Document {
  title: string
  slug: string
  namespace: 'main' | 'user' | 'project' | 'template' | 'help' | 'category' | 'file'
  content: string
  summary?: string
  categories: string[]
  tags: string[]
  aliases: string[]
  creator: string
  creatorId?: mongoose.Types.ObjectId
  lastEditor?: string
  lastEditorId?: mongoose.Types.ObjectId
  lastEditDate: Date
  lastEditSummary?: string
  currentRevision: number
  revisions: Array<any>
  protection: {
    level: 'none' | 'semi' | 'full' | 'admin'
    reason?: string
    protectedBy?: string
    protectedUntil?: Date
    allowedRoles: string[]
  }
  isRedirect: boolean
  redirectTarget?: string
  isDeleted: boolean
  deletedBy?: string
  deleteReason?: string
  isStub: boolean
  isFeatured: boolean
  views: number
  uniqueViews: number
  edits: number
  watchers: mongoose.Types.ObjectId[]
  discussions: Array<any>
  incomingLinks: string[]
  outgoingLinks: string[]
  tableOfContents: Array<{
    level: number
    title: string
    anchor: string
  }>
  templateInfo: {
    isTemplate: boolean
    parameters: Array<{
      name?: string
      description?: string
      required: boolean
      defaultValue?: string
    }>
    usage?: string
  }
  editLock: {
    isLocked: boolean
    lockedBy?: string
    lockedById?: mongoose.Types.ObjectId
    lockStartTime?: Date
    lockExpiry?: Date
    lockReason?: string
  }
  createdAt: Date
  updatedAt: Date
}

export interface IWikiSubmission extends mongoose.Document {
  type: 'create' | 'edit'
  status: 'pending' | 'approved' | 'rejected' | 'onhold'
  reason?: string
  namespace: string
  targetTitle: string
  targetSlug: string
  pageId?: mongoose.Types.ObjectId
  content: string
  summary?: string
  editSummary?: string
  categories: string[]
  tags: string[]
  expectedRevision?: number
  author: string
  authorId: mongoose.Types.ObjectId
  reviewedBy?: string
  reviewerId?: mongoose.Types.ObjectId
  reviewedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const WikiUser = mongoose.models.WikiUser || mongoose.model<IWikiUser>('WikiUser', WikiUserSchema)
const WikiPage = mongoose.models.WikiPage || mongoose.model<IWikiPage>('WikiPage', WikiPageSchema)
const WikiRevision = mongoose.models.WikiRevision || mongoose.model('WikiRevision', WikiRevisionSchema)
const WikiDiscussion = mongoose.models.WikiDiscussion || mongoose.model('WikiDiscussion', WikiDiscussionSchema)
const WikiNamespace = mongoose.models.WikiNamespace || mongoose.model('WikiNamespace', WikiNamespaceSchema)
const WikiConfig = mongoose.models.WikiConfig || mongoose.model('WikiConfig', WikiConfigSchema)
const WikiSubmission = mongoose.models.WikiSubmission || mongoose.model<IWikiSubmission>('WikiSubmission', WikiSubmissionSchema)

export { WikiUser, WikiPage, WikiRevision, WikiDiscussion, WikiNamespace, WikiConfig, WikiSubmission }
export default WikiPage 
