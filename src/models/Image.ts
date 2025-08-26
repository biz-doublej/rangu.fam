import mongoose, { Document, Schema } from 'mongoose'

export interface IImage extends Document {
  _id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  data: string // base64 encoded image data
  uploadedBy: string
  uploadedById: string
  category: 'profile' | 'wiki' | 'music' | 'general'
  description?: string
  isPublic: boolean
  createdAt: Date
  updatedAt: Date
}

const ImageSchema: Schema = new Schema({
  filename: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  mimeType: {
    type: String,
    required: true,
    enum: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
  },
  size: {
    type: Number,
    required: true,
    min: 0,
    max: 5 * 1024 * 1024 // 5MB limit
  },
  data: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: String,
    required: true
  },
  uploadedById: {
    type: String,
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: ['profile', 'wiki', 'music', 'general'],
    default: 'general'
  },
  description: {
    type: String,
    maxlength: 500,
    trim: true
  },
  isPublic: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

// 인덱스 설정
// ImageSchema.index({ filename: 1 }, { unique: true }) - 스키마에서 unique: true로 자동 생성됨
ImageSchema.index({ uploadedById: 1 })
ImageSchema.index({ category: 1 })
ImageSchema.index({ createdAt: -1 })
ImageSchema.index({ mimeType: 1 })

export default mongoose.models.Image || mongoose.model<IImage>('Image', ImageSchema)