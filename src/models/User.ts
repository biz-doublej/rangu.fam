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
  isOnline: boolean
  totalPlays: number
  totalLikes: number
  createdAt: Date
  updatedAt: Date
}

const UserSchema: Schema = new Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 20
  },
  email: {
    type: String,
    required: true,
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
  isOnline: {
    type: Boolean,
    default: false
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

// 인덱스 설정
UserSchema.index({ username: 1 })
UserSchema.index({ email: 1 })

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema) 