import mongoose from 'mongoose'

// 스킬 스키마
const SkillSchema = new mongoose.Schema({
  name: { type: String, required: true },
  level: { type: Number, required: true, min: 0, max: 100 },
  category: { type: String, required: true }
})

// 프로젝트 스키마
const ProjectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  tech: [{ type: String }],
  image: { type: String },
  liveUrl: { type: String },
  githubUrl: { type: String },
  featured: { type: Boolean, default: false },
  startDate: { type: Date },
  endDate: { type: Date },
  status: { type: String, enum: ['completed', 'in-progress', 'planned'], default: 'completed' }
}, { timestamps: true })

// 경력 스키마
const ExperienceSchema = new mongoose.Schema({
  company: { type: String, required: true },
  position: { type: String, required: true },
  period: { type: String, required: true },
  description: { type: String },
  skills: [{ type: String }],
  achievements: [{ type: String }],
  location: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  isCurrent: { type: Boolean, default: false }
}, { timestamps: true })

// 교육 스키마
const EducationSchema = new mongoose.Schema({
  school: { type: String, required: true },
  degree: { type: String, required: true },
  period: { type: String, required: true },
  description: { type: String },
  gpa: { type: Number },
  major: { type: String },
  location: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  honors: [{ type: String }]
}, { timestamps: true })

// 소셜 링크 스키마
const SocialLinksSchema = new mongoose.Schema({
  github: { type: String },
  linkedin: { type: String },
  website: { type: String },
  instagram: { type: String },
  twitter: { type: String },
  blog: { type: String }
})

// 최근 활동/게시물 스키마
const RecentPostSchema = new mongoose.Schema({
  content: { type: String, required: true },
  type: { type: String, enum: ['text', 'image', 'link', 'project'], default: 'text' },
  mediaUrl: { type: String },
  linkUrl: { type: String },
  tags: [{ type: String }],
  likes: { type: Number, default: 0 },
  likedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  isPrivate: { type: Boolean, default: false }
}, { timestamps: true })

// 메인 프로필 스키마
const ProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  username: { type: String, required: true, unique: true },
  
  // 개인 정보
  intro: { type: String, default: '' },
  bio: { type: String, default: '' },
  location: { type: String, default: '' },
  website: { type: String },
  phone: { type: String },
  birthdate: { type: Date },
  
  // 포트폴리오 데이터
  skills: [SkillSchema],
  projects: [ProjectSchema],
  experience: [ExperienceSchema],
  education: [EducationSchema],
  socialLinks: SocialLinksSchema,
  
  // 최근 활동
  recentPosts: [RecentPostSchema],
  
  // 통계
  viewCount: { type: Number, default: 0 },
  likesReceived: { type: Number, default: 0 },
  
  // 설정
  isPublic: { type: Boolean, default: true },
  showEmail: { type: Boolean, default: false },
  showPhone: { type: Boolean, default: false },
  allowComments: { type: Boolean, default: true }
}, { timestamps: true })

// 인덱스 설정
ProfileSchema.index({ userId: 1 })
ProfileSchema.index({ username: 1 })
ProfileSchema.index({ 'skills.name': 1 })
ProfileSchema.index({ 'projects.featured': 1 })
ProfileSchema.index({ createdAt: -1 })

// 인터페이스 정의
export interface IProfile extends mongoose.Document {
  userId: mongoose.Types.ObjectId
  username: string
  intro: string
  bio: string
  location: string
  website: string
  phone: string
  birthdate: Date
  skills: Array<{
    name: string
    level: number
    category: string
  }>
  projects: Array<{
    title: string
    description: string
    tech: string[]
    image?: string
    liveUrl?: string
    githubUrl?: string
    featured: boolean
    startDate?: Date
    endDate?: Date
    status: 'completed' | 'in-progress' | 'planned'
    createdAt: Date
    updatedAt: Date
  }>
  experience: Array<{
    company: string
    position: string
    period: string
    description?: string
    skills: string[]
    achievements: string[]
    location?: string
    startDate?: Date
    endDate?: Date
    isCurrent: boolean
    createdAt: Date
    updatedAt: Date
  }>
  education: Array<{
    school: string
    degree: string
    period: string
    description?: string
    gpa?: number
    major?: string
    location?: string
    startDate?: Date
    endDate?: Date
    honors: string[]
    createdAt: Date
    updatedAt: Date
  }>
  socialLinks: {
    github?: string
    linkedin?: string
    website?: string
    instagram?: string
    twitter?: string
    blog?: string
  }
  recentPosts: Array<{
    content: string
    type: 'text' | 'image' | 'link' | 'project'
    mediaUrl?: string
    linkUrl?: string
    tags: string[]
    likes: number
    likedBy: mongoose.Types.ObjectId[]
    comments: Array<{
      userId: mongoose.Types.ObjectId
      username: string
      content: string
      createdAt: Date
    }>
    isPrivate: boolean
    createdAt: Date
    updatedAt: Date
  }>
  viewCount: number
  likesReceived: number
  isPublic: boolean
  showEmail: boolean
  showPhone: boolean
  allowComments: boolean
  createdAt: Date
  updatedAt: Date
}

const Profile = mongoose.models.Profile || mongoose.model<IProfile>('Profile', ProfileSchema)

export default Profile 