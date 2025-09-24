import mongoose, { Document, Schema } from 'mongoose'

// 공통에서 사용하는 카드 타입/희귀도 열거형을 모델에서 노출
export enum CardType {
  YEAR = 'year',
  SPECIAL = 'special',
  SIGNATURE = 'signature',
  MATERIAL = 'material',
  PRESTIGE = 'prestige'
}

export enum CardRarity {
  BASIC = 'basic',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
  MATERIAL = 'material'
}

export interface ICard extends Document {
  cardId: string
  name: string
  type: CardType | string
  rarity: CardRarity | string
  description: string
  imageUrl: string
  cardImageUrl?: string
  isGroupCard: boolean
  dropRate: number
  canBeUsedForCrafting: boolean
  // 선택 필드 (시드에서 사용)
  member?: string
  year?: number
  version?: number
  period?: string
  backgroundUrl?: string
  maxCopies?: number
  craftingRecipe?: any
  createdAt: Date
  updatedAt: Date
}

const CardSchema = new Schema({
  cardId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, required: true },
  rarity: { type: String, required: true },
  description: { type: String, required: true },
  imageUrl: { type: String, required: true },
  // 일부 카드 타입(연도/스페셜 등)은 cardImageUrl이 없을 수 있으므로 필수 해제
  cardImageUrl: { type: String, required: false, default: '' },
  isGroupCard: { type: Boolean, default: false },
  dropRate: { type: Number, default: 0 },
  canBeUsedForCrafting: { type: Boolean, default: false },
  // 선택 필드들
  member: { type: String },
  year: { type: Number },
  version: { type: Number },
  period: { type: String },
  backgroundUrl: { type: String },
  maxCopies: { type: Number },
  craftingRecipe: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
} as any)

// 모델이 이미 컴파일되었는지 확인 (CRA 빌드에서 복잡한 제네릭 회피)
let CardModel: any
if (mongoose.models.Card) {
  CardModel = mongoose.model('Card')
} else {
  CardModel = mongoose.model('Card', CardSchema)
}

export const Card = CardModel as unknown as mongoose.Model<ICard>
