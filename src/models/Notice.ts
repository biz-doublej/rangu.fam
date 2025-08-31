import mongoose from 'mongoose'

export interface INotice {
  _id?: string
  id: number
  title: string
  content: string
  type: 'announcement' | 'update' | 'policy' | 'maintenance' | 'event'
  isPinned: boolean
  author: string
  date: Date
  category: string
  createdAt?: Date
  updatedAt?: Date
}

const NoticeSchema = new mongoose.Schema<INotice>({
  id: {
    type: Number,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  type: {
    type: String,
    enum: ['announcement', 'update', 'policy', 'maintenance', 'event'],
    default: 'announcement'
  },
  isPinned: {
    type: Boolean,
    default: false
  },
  author: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  date: {
    type: Date,
    required: true,
    default: Date.now
  },
  category: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  }
}, {
  timestamps: true, // createdAt, updatedAt 자동 생성
  collection: 'notices'
})

// 인덱스 설정
NoticeSchema.index({ id: 1 })
NoticeSchema.index({ date: -1 })
NoticeSchema.index({ isPinned: -1 })
NoticeSchema.index({ type: 1 })

// 가상 필드 설정
NoticeSchema.virtual('isNew').get(function() {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  return this.date > threeDaysAgo
})

// JSON 변환 시 _id를 id로 매핑
NoticeSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc: any, ret: any) {
    delete ret._id
    delete ret.__v
    return ret
  }
})

const Notice = mongoose.models.Notice || mongoose.model<INotice>('Notice', NoticeSchema)

export default Notice
