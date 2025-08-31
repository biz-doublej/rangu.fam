import mongoose, { Document, Schema } from 'mongoose'

export interface ICard extends Document {
  cardId: string
  name: string
  type: string
  rarity: string
  description: string
  imageUrl: string
  cardImageUrl: string
  isGroupCard: boolean
  dropRate: number
  canBeUsedForCrafting: boolean
  createdAt: Date
  updatedAt: Date
}

const CardSchema = new Schema<ICard>({
  cardId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  rarity: { type: String, required: true },
  description: { type: String, required: true },
  imageUrl: { type: String, required: true },
  cardImageUrl: { type: String, required: true },
  isGroupCard: { type: Boolean, default: false },
  dropRate: { type: Number, default: 0 },
  canBeUsedForCrafting: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
})

// 모델이 이미 컴파일되었는지 확인
export const Card = mongoose.models.Card || mongoose.model<ICard>('Card', CardSchema)