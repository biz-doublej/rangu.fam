import mongoose from 'mongoose'

// 사용자 카드 인벤토리 스키마
export interface IUserCard {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId    // 사용자 ID
  cardId: string                     // 카드 ID (Card 모델의 cardId 참조)
  quantity: number                   // 소장 수량
  
  // 획득 정보
  acquiredAt: Date                   // 획득 일시
  acquiredBy: 'drop' | 'craft' | 'gift' | 'admin'  // 획득 방법
  
  // 카드 상태
  isFavorite: boolean                // 즐겨찾기 여부
  isLocked: boolean                  // 잠김 여부 (실수로 조합에 사용되지 않도록)
  
  createdAt: Date
  updatedAt: Date
}

const UserCardSchema = new mongoose.Schema<IUserCard>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  cardId: {
    type: String,
    required: true,
    index: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 1
  },
  acquiredAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  acquiredBy: {
    type: String,
    enum: ['drop', 'craft', 'gift', 'admin'],
    required: true,
    default: 'drop'
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  isLocked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

// 복합 인덱스 (사용자당 카드별로 하나씩만 존재해야 함)
UserCardSchema.index({ userId: 1, cardId: 1 }, { unique: true })
UserCardSchema.index({ userId: 1, isFavorite: 1 })
UserCardSchema.index({ userId: 1, acquiredAt: -1 })

export const UserCard = mongoose.models.UserCard || mongoose.model<IUserCard>('UserCard', UserCardSchema)
