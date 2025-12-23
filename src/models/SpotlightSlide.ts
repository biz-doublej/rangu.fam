import mongoose, { Document, Schema } from 'mongoose'

export interface ISpotlightSlide extends Document {
  title: string
  type: 'video' | 'image'
  description?: string
  srcPath: string
  posterPath?: string
  order: number
  durationSeconds?: number
  isActive: boolean
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

const SpotlightSlideSchema = new Schema<ISpotlightSlide>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['video', 'image'],
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
    srcPath: {
      type: String,
      required: true,
    },
    posterPath: {
      type: String,
    },
    order: {
      type: Number,
      default: 0,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
  }
)

SpotlightSlideSchema.index({ order: 1 })
SpotlightSlideSchema.index({ isActive: 1, order: 1 })
SpotlightSlideSchema.index({ srcPath: 1 })

const SpotlightSlide =
  mongoose.models.SpotlightSlide ||
  mongoose.model<ISpotlightSlide>('SpotlightSlide', SpotlightSlideSchema)

export default SpotlightSlide
