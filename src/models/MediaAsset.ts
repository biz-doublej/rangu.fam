import mongoose, { Document, Schema } from 'mongoose'

export type MediaCategory = 'image' | 'video' | 'audio' | 'wiki' | 'other'

export interface IMediaAsset extends Document {
  originalPath: string
  filename: string
  mimeType: string
  size: number
  category: MediaCategory
  gridFsId: mongoose.Types.ObjectId
  description?: string
  tags: string[]
  checksum?: string
  metadata?: Record<string, any>
  createdAt: Date
  updatedAt: Date
}

const MediaAssetSchema = new Schema<IMediaAsset>(
  {
    originalPath: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    filename: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      enum: ['image', 'video', 'audio', 'wiki', 'other'],
      default: 'other',
    },
    gridFsId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    checksum: {
      type: String,
      index: true,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
)

MediaAssetSchema.index({ category: 1, createdAt: -1 })
MediaAssetSchema.index({ tags: 1 })

const MediaAsset =
  mongoose.models.MediaAsset || mongoose.model<IMediaAsset>('MediaAsset', MediaAssetSchema)

export default MediaAsset
