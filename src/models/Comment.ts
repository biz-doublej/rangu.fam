import mongoose, { Document, Schema } from 'mongoose'

export interface IComment extends Document {
  _id: string
  content: string
  userId: string
  userById: string
  username: string
  trackId?: string
  playlistId?: string
  parentCommentId?: string
  repliesIds: string[]
  likes: number
  isEdited: boolean
  editedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const CommentSchema: Schema = new Schema({
  content: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  userId: {
    type: String,
    required: true
  },
  userById: {
    type: String,
    required: true
  },
  username: {
    type: String,
    required: true
  },
  trackId: {
    type: String
  },
  playlistId: {
    type: String
  },
  parentCommentId: {
    type: String
  },
  repliesIds: [{
    type: String
  }],
  likes: {
    type: Number,
    default: 0,
    min: 0
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  }
}, {
  timestamps: true
})

// 인덱스 설정
CommentSchema.index({ trackId: 1, createdAt: -1 })
CommentSchema.index({ playlistId: 1, createdAt: -1 })
CommentSchema.index({ userById: 1 })
CommentSchema.index({ parentCommentId: 1 })

export default mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema) 