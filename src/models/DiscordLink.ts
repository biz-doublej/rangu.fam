import mongoose, { Document, Schema } from 'mongoose'

export interface IDiscordLink extends Document {
  discordId: string
  discordUsername?: string
  discordAvatar?: string
  memberId?: string
  memberLinkedAt?: Date
  wikiUserId?: mongoose.Types.ObjectId
  wikiUsername?: string
  wikiLinkedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const DiscordLinkSchema = new Schema(
  {
    discordId: { type: String, required: true, unique: true },
    discordUsername: { type: String },
    discordAvatar: { type: String },
    memberId: { type: String },
    memberLinkedAt: { type: Date },
    wikiUserId: { type: Schema.Types.ObjectId, ref: 'WikiUser' },
    wikiUsername: { type: String },
    wikiLinkedAt: { type: Date },
  },
  {
    timestamps: true,
  }
)

export default mongoose.models.DiscordLink ||
  mongoose.model<IDiscordLink>('DiscordLink', DiscordLinkSchema)
