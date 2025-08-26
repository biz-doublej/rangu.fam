import mongoose from 'mongoose'

// 카드 타입 정의
export enum CardType {
  YEAR = 'year',        // 년도 카드 (베이직 | 50%)
  SPECIAL = 'special',  // 스페셜 카드 (희귀 | 30%)
  SIGNATURE = 'signature', // 시그니처 카드 (희귀 | 10%)
  MATERIAL = 'material', // 재료 카드 (조합용 | 10%)
  PRESTIGE = 'prestige'  // 프레스티지 카드 (초희귀 | 0%)
}

// 카드 등급
export enum CardRarity {
  BASIC = 'basic',      // 회색 (50%)
  RARE = 'rare',        // 다양한 색 (30% + 10%)
  EPIC = 'epic',        // 분홍색 (10%)
  MATERIAL = 'material', // 조합용 (10%)
  LEGENDARY = 'legendary' // 황금색 (0%)
}

// 카드 기본 정보 스키마
export interface ICard {
  _id: mongoose.Types.ObjectId
  cardId: string          // 고유 카드 식별자 (예: "jaewon_2021_h1", "group_formation")
  name: string            // 카드 이름
  type: CardType          // 카드 타입
  rarity: CardRarity      // 카드 등급
  description: string     // 카드 설명
  imageUrl: string        // 카드 이미지 URL
  
  // 카드별 특정 정보
  member?: string         // 멤버 이름 (개인 카드의 경우)
  year?: number          // 연도 (년도 카드의 경우)
  period?: 'h1' | 'h2'   // 상반기/하반기 (년도 카드의 경우)
  isGroupCard?: boolean   // 단체 카드 여부
  
  // 메타데이터
  dropRate: number        // 드랍 확률
  maxCopies?: number      // 최대 소장 가능 수량 (무제한이면 null)
  
  // 조합 관련
  canBeUsedForCrafting?: boolean  // 조합 재료로 사용 가능 여부
  craftingRecipe?: {      // 조합 레시피 (프레스티지 카드의 경우)
    requiredCards: {
      type: CardType
      count: number
    }[]
    successRate: number   // 조합 성공률 (70% = 꽝 30%)
  }
  
  createdAt: Date
  updatedAt: Date
}

const CardSchema = new mongoose.Schema<ICard>({
  cardId: {
    type: String,
    required: true,
    unique: true
    // index는 unique: true로 자동 생성됨
  },
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: Object.values(CardType),
    required: true
  },
  rarity: {
    type: String,
    enum: Object.values(CardRarity),
    required: true
  },
  description: {
    type: String,
    required: true
  },
  imageUrl: {
    type: String,
    required: true
  },
  member: {
    type: String,
    sparse: true
  },
  year: {
    type: Number,
    sparse: true
  },
  period: {
    type: String,
    enum: ['h1', 'h2'],
    sparse: true
  },
  isGroupCard: {
    type: Boolean,
    default: false
  },
  dropRate: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  maxCopies: {
    type: Number,
    min: 1
  },
  canBeUsedForCrafting: {
    type: Boolean,
    default: false
  },
  craftingRecipe: {
    requiredCards: [{
      type: {
        type: String,
        enum: Object.values(CardType)
      },
      count: Number
    }],
    successRate: {
      type: Number,
      min: 0,
      max: 1
    }
  }
}, {
  timestamps: true
})

// 인덱스 설정
CardSchema.index({ type: 1, rarity: 1 })
CardSchema.index({ member: 1, year: 1, period: 1 })
CardSchema.index({ dropRate: 1 })

export const Card = mongoose.models.Card || mongoose.model<ICard>('Card', CardSchema)
