import mongoose, { Document, Schema } from 'mongoose'

export interface IUser extends Document {
  _id: string
  username: string
  email: string
  password: string
  profileImage?: string
  role: string
  bio?: string
  favoriteGenres: string[]
  favoriteTracksIds: string[]
  playlistsIds: string[]
  followingIds: string[]
  followersIds: string[]
  lastLogin: Date
  totalPlays: number
  totalLikes: number
  createdAt: Date
  updatedAt: Date
}

const UserSchema: Schema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 2,
    maxlength: 20
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profileImage: {
    type: String,
    default: ''
  },
  role: {
    type: String,
    default: 'member',
    enum: ['admin', 'member']
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  favoriteGenres: [{
    type: String
  }],
  favoriteTracksIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Track'
  }],
  playlistsIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Playlist'
  }],
  followingIds: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  followersIds: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  lastLogin: {
    type: Date,
    default: Date.now
  },
  totalPlays: {
    type: Number,
    default: 0
  },
  totalLikes: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
})

// 복합 인덱스 설정 (unique는 이미 스키마에서 설정됨)
// UserSchema.index({ username: 1 }) - unique: true로 자동 생성됨
// UserSchema.index({ email: 1 }) - unique: true로 자동 생성됨
UserSchema.index({ role: 1 }) // 성능 최적화용 복합 인덱스

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema) 
