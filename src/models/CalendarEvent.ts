import mongoose, { Schema, Document } from 'mongoose'

export interface ICalendarEvent extends Document {
  title: string
  description?: string
  startDate: Date
  endDate: Date
  allDay: boolean
  createdById?: string
  createdByName?: string
  isPrivate: boolean
  attendees: string[]
  location?: string
  color?: string
  capsulePrompt?: string
  tags?: string[]
  gallery: {
    url: string
    title?: string
    description?: string
    uploadedBy?: string
    uploadDate: Date
  }[]
  createdAt: Date
  updatedAt: Date
}

const GalleryImageSchema = new Schema(
  {
    url: { type: String, required: true },
    title: String,
    description: String,
    uploadedBy: String,
    uploadDate: { type: Date, default: Date.now }
  },
  { _id: false }
)

const CalendarEventSchema = new Schema<ICalendarEvent>(
  {
    title: { type: String, required: true },
    description: { type: String, default: '' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    allDay: { type: Boolean, default: false },
    createdById: { type: String },
    createdByName: { type: String },
    isPrivate: { type: Boolean, default: false },
    attendees: { type: [String], default: [] },
    location: { type: String },
    color: { type: String, default: '#6b5bff' },
    capsulePrompt: { type: String },
    tags: { type: [String], default: [] },
    gallery: { type: [GalleryImageSchema], default: [] }
  },
  {
    timestamps: true
  }
)

const CalendarEvent =
  mongoose.models.CalendarEvent ||
  mongoose.model<ICalendarEvent>('CalendarEvent', CalendarEventSchema)

export default CalendarEvent
