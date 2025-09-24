import mongoose from 'mongoose'

// 히스토리 이벤트 스키마
const HistoryEventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true },
  type: { 
    type: String, 
    enum: ['formation', 'member', 'milestone', 'feature', 'anniversary', 'special'],
    required: true 
  },
  icon: { type: String, default: '📅' },
  color: { type: String, default: 'primary' },
  relatedMembers: [{ type: String }], // 멤버 ID들
  importance: { type: Number, min: 1, max: 5, default: 3 }, // 중요도
  images: [{ type: String }], // 이미지 URLs
  links: [{
    title: { type: String },
    url: { type: String }
  }],
  isPublic: { type: Boolean, default: true },
  isAnniversary: { type: Boolean, default: false },
  anniversary: {
    interval: { type: Number }, // 몇 년마다
    nextDate: { type: Date }
  }
}, { timestamps: true })

// 기념일 마일스톤 스키마
const MilestoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['formation', 'complete'], required: true },
  targetDays: { type: Number, required: true },
  emoji: { type: String, required: true },
  color: { type: String, default: 'primary' },
  isCompleted: { type: Boolean, default: false },
  completedDate: { type: Date },
  specialMessage: { type: String },
  celebrationDetails: {
    hasSpecialEvent: { type: Boolean, default: false },
    eventDescription: { type: String },
    eventImages: [{ type: String }]
  }
}, { timestamps: true })

// 사이트 통계 스키마
const SiteStatsSchema = new mongoose.Schema({
  totalVisits: { type: Number, default: 0 },
  uniqueVisitors: { type: Number, default: 0 },
  totalPages: { type: Number, default: 0 },
  totalUsers: { type: Number, default: 0 },
  totalPosts: { type: Number, default: 0 },
  totalComments: { type: Number, default: 0 },
  totalLikes: { type: Number, default: 0 },
  totalMusicPlays: { type: Number, default: 0 },
  totalGameScores: { type: Number, default: 0 },
  
  // 월별 통계
  monthlyStats: [{
    year: { type: Number, required: true },
    month: { type: Number, required: true },
    visits: { type: Number, default: 0 },
    newUsers: { type: Number, default: 0 },
    newPosts: { type: Number, default: 0 },
    newComments: { type: Number, default: 0 }
  }]
}, { timestamps: true })

// 메인 사이트 히스토리 스키마
const SiteHistorySchema = new mongoose.Schema({
  // 기본 정보
  siteName: { type: String, default: 'Rangu.fam' },
  siteDescription: { type: String, default: '네 친구들의 소중한 공간' },
  
  // 중요한 날짜들
  formationDate: { type: Date, required: true }, // 랑구팸 결성일
  completeDate: { type: Date, required: true },  // 완전체 결성일
  siteCreationDate: { type: Date, required: true }, // 웹사이트 개설일
  
  // 히스토리 이벤트들
  events: [HistoryEventSchema],
  
  // 마일스톤들
  milestones: [MilestoneSchema],
  
  // 통계
  stats: SiteStatsSchema,
  
  // 미래 계획된 이벤트들
  plannedEvents: [{
    name: { type: String, required: true },
    description: { type: String },
    targetDate: { type: Date },
    type: { type: String },
    isAnniversary: { type: Boolean, default: false }
  }],
  
  // 사이트 버전 히스토리
  versionHistory: [{
    version: { type: String, required: true },
    releaseDate: { type: Date, required: true },
    features: [{ type: String }],
    bugFixes: [{ type: String }],
    improvements: [{ type: String }],
    contributor: { type: String }
  }]
} as any, { timestamps: true })

// 인덱스 설정
HistoryEventSchema.index({ date: -1 })
HistoryEventSchema.index({ type: 1 })
HistoryEventSchema.index({ importance: -1 })

MilestoneSchema.index({ targetDays: 1 })
MilestoneSchema.index({ type: 1 })
MilestoneSchema.index({ isCompleted: 1 })

// 인터페이스 정의
export interface IHistoryEvent {
  title: string
  description?: string
  date: Date
  type: 'formation' | 'member' | 'milestone' | 'feature' | 'anniversary' | 'special'
  icon: string
  color: string
  relatedMembers: string[]
  importance: number
  images: string[]
  links: Array<{
    title?: string
    url: string
  }>
  isPublic: boolean
  isAnniversary: boolean
  anniversary?: {
    interval: number
    nextDate: Date
  }
  createdAt: Date
  updatedAt: Date
}

export interface IMilestone {
  name: string
  type: 'formation' | 'complete'
  targetDays: number
  emoji: string
  color: string
  isCompleted: boolean
  completedDate?: Date
  specialMessage?: string
  celebrationDetails: {
    hasSpecialEvent: boolean
    eventDescription?: string
    eventImages: string[]
  }
  createdAt: Date
  updatedAt: Date
}

export interface ISiteHistory extends mongoose.Document {
  siteName: string
  siteDescription: string
  formationDate: Date
  completeDate: Date
  siteCreationDate: Date
  events: IHistoryEvent[]
  milestones: IMilestone[]
  stats: {
    totalVisits: number
    uniqueVisitors: number
    totalPages: number
    totalUsers: number
    totalPosts: number
    totalComments: number
    totalLikes: number
    totalMusicPlays: number
    totalGameScores: number
    monthlyStats: Array<{
      year: number
      month: number
      visits: number
      newUsers: number
      newPosts: number
      newComments: number
    }>
  }
  plannedEvents: Array<{
    name: string
    description?: string
    targetDate?: Date
    type?: string
    isAnniversary: boolean
  }>
  versionHistory: Array<{
    version: string
    releaseDate: Date
    features: string[]
    bugFixes: string[]
    improvements: string[]
    contributor?: string
  }>
  createdAt: Date
  updatedAt: Date
}

let SiteHistoryModel: any
if (mongoose.models.SiteHistory) {
  SiteHistoryModel = mongoose.model('SiteHistory')
} else {
  SiteHistoryModel = mongoose.model('SiteHistory', SiteHistorySchema)
}

const SiteHistory = SiteHistoryModel as unknown as mongoose.Model<ISiteHistory>

export default SiteHistory 
