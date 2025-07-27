import mongoose, { Document, Schema } from 'mongoose'

export interface ITrack extends Document {
  _id: string
  title: string
  artist: string
  album?: string
  duration: number
  youtubeId?: string
  spotifyId?: string
  soundcloudId?: string
  coverImage: string
  uploadedBy: string
  uploadedById: string
  genre: string
  tags: string[]
  description?: string
  likes: number
  dislikes: number
  plays: number
  commentsIds: string[]
  isPublic: boolean
  isFeatured: boolean
  createdAt: Date
  updatedAt: Date
}

const TrackSchema: Schema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  artist: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  album: {
    type: String,
    trim: true,
    maxlength: 200
  },
  duration: {
    type: Number,
    required: true,
    min: 0
  },
  youtubeId: {
    type: String,
    trim: true
  },
  spotifyId: {
    type: String,
    trim: true
  },
  soundcloudId: {
    type: String,
    trim: true
  },
  coverImage: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: String,
    required: true
  },
  uploadedById: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  genre: {
    type: String,
    required: true,
    enum: [
      'Pop', 'Rock', 'Hip Hop', 'Electronic', 'Jazz', 'Classical', 
      'Country', 'R&B', 'Reggae', 'Blues', 'Folk', 'Metal',
      'Lo-fi Hip Hop', 'Ambient', 'Chiptune', 'Indie', 'Alternative',
      'Funk', 'Soul', 'Disco', 'House', 'Techno', 'Dubstep', 'Other'
    ]
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  description: {
    type: String,
    maxlength: 1000
  },
  likes: {
    type: Number,
    default: 0,
    min: 0
  },
  dislikes: {
    type: Number,
    default: 0,
    min: 0
  },
  plays: {
    type: Number,
    default: 0,
    min: 0
  },
  commentsIds: [{
    type: Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

// 인덱스 설정
TrackSchema.index({ title: 'text', artist: 'text', album: 'text', tags: 'text' })
TrackSchema.index({ genre: 1 })
TrackSchema.index({ uploadedById: 1 })
TrackSchema.index({ createdAt: -1 })
TrackSchema.index({ plays: -1 })
TrackSchema.index({ likes: -1 })

export default mongoose.models.Track || mongoose.model<ITrack>('Track', TrackSchema) 