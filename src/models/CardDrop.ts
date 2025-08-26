import mongoose from 'mongoose'

// 카드 드랍 로그 스키마
export interface ICardDrop {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId    // 사용자 ID
  cardId: string                     // 드랍된 카드 ID
  dropType: 'daily' | 'craft' | 'special'  // 드랍 타입
  
  // 드랍 정보
  droppedAt: Date                    // 드랍 일시
  dailyDropCount: number             // 해당 날짜의 몇 번째 드랍인지
  
  // 조합 관련 (조합으로 획득한 경우)
  craftingAttempt?: {
    usedCards: {
      cardId: string
      quantity: number
    }[]
    wasSuccessful: boolean           // 조합 성공 여부
  }
  
  createdAt: Date
}

const CardDropSchema = new mongoose.Schema<ICardDrop>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
    // index는 복합 인덱스에서 처리됨
  },
  cardId: {
    type: String,
    required: true
    // index는 복합 인덱스에서 처리됨
  },
  dropType: {
    type: String,
    enum: ['daily', 'craft', 'special'],
    required: true
  },
  droppedAt: {
    type: Date,
    required: true,
    default: Date.now
    // index는 복합 인덱스에서 처리됨
  },
  dailyDropCount: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  craftingAttempt: {
    usedCards: [{
      cardId: String,
      quantity: Number
    }],
    wasSuccessful: Boolean
  }
}, {
  timestamps: true
})

// 인덱스 설정
CardDropSchema.index({ userId: 1, droppedAt: -1 })
CardDropSchema.index({ userId: 1, dropType: 1, droppedAt: -1 })

export const CardDrop = mongoose.models.CardDrop || mongoose.model<ICardDrop>('CardDrop', CardDropSchema)
