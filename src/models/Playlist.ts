import mongoose, { Document, Schema } from 'mongoose'

export interface IPlaylist extends Document {
  _id: string
  name: string
  description?: string
  tracksIds: string[]
  createdBy: string
  createdById: string
  collaboratorsIds: string[]
  followersIds: string[]
  tags: string[]
  coverImage?: string
  likes: number
  plays: number
  isPublic: boolean
  isCollaborative: boolean
  isFeatured: boolean
  totalDuration: number
  createdAt: Date
  updatedAt: Date
}

const PlaylistSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  description: {
    type: String,
    trim: true,
    maxlength: 500
  },
  tracksIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Track'
  }],
  createdBy: {
    type: String,
    required: true
  },
  createdById: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  collaboratorsIds: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  followersIds: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  coverImage: {
    type: String,
    default: ''
  },
  likes: {
    type: Number,
    default: 0,
    min: 0
  },
  plays: {
    type: Number,
    default: 0,
    min: 0
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  isCollaborative: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  totalDuration: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
})

// 인덱스 설정
PlaylistSchema.index({ name: 'text', description: 'text', tags: 'text' })
PlaylistSchema.index({ createdById: 1 })
PlaylistSchema.index({ isPublic: 1 })
PlaylistSchema.index({ createdAt: -1 })
PlaylistSchema.index({ likes: -1 })
PlaylistSchema.index({ plays: -1 })

export default mongoose.models.Playlist || mongoose.model<IPlaylist>('Playlist', PlaylistSchema) 