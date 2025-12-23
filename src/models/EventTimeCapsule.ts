import mongoose, { Schema, Document } from 'mongoose'

export interface IEventTimeCapsule extends Document {
  eventId: mongoose.Types.ObjectId
  authorId: string
  authorName?: string
  mood: 'happy' | 'excited' | 'nervous' | 'tired' | 'thoughtful' | 'custom'
  memo: string
  unlockDate: Date
  createdAt: Date
  updatedAt: Date
}

const EventTimeCapsuleSchema = new Schema<IEventTimeCapsule>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: 'CalendarEvent', required: true },
    authorId: { type: String, required: true },
    authorName: { type: String },
    mood: {
      type: String,
      enum: ['happy', 'excited', 'nervous', 'tired', 'thoughtful', 'custom'],
      required: true
    },
    memo: { type: String, required: true },
    unlockDate: { type: Date, required: true }
  },
  {
    timestamps: true
  }
)

EventTimeCapsuleSchema.index({ eventId: 1, authorId: 1 }, { unique: true })

const EventTimeCapsule =
  mongoose.models.EventTimeCapsule ||
  mongoose.model<IEventTimeCapsule>('EventTimeCapsule', EventTimeCapsuleSchema)

export default EventTimeCapsule
