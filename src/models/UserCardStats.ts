import mongoose from 'mongoose'

// 사용자 카드 통계 스키마
export interface IUserCardStats {
  _id: mongoose.Types.ObjectId
  userId: mongoose.Types.ObjectId    // 사용자 ID
  
  // 일일 드랍 정보
  lastDropDate: Date                 // 마지막 드랍 날짜
  dailyDropsUsed: number            // 오늘 사용한 드랍 횟수 (5회 제한)
  totalDropsUsed: number            // 총 사용한 드랍 횟수
  
  // 카드 수집 통계
  totalCardsOwned: number           // 총 소장 카드 수 (중복 포함)
  uniqueCardsOwned: number          // 고유 카드 수
  totalCardsCollected: number       // 지금까지 획득한 총 카드 수
  
  // 등급별 수집 통계
  basicCardsOwned: number           // 베이직 카드 수
  rareCardsOwned: number            // 레어 카드 수
  epicCardsOwned: number            // 에픽 카드 수
  legendaryCardsOwned: number       // 레전더리 카드 수
  materialCardsOwned: number        // 재료 카드 수
  
  // 조합 통계
  craftingAttempts: number          // 조합 시도 횟수
  successfulCrafts: number          // 성공한 조합 횟수
  failedCrafts: number              // 실패한 조합 횟수
  
  // 컬렉션 달성도
  yearCardCompletion: {             // 년도별 카드 수집 현황
    year: number
    totalCards: number              // 해당 년도 총 카드 수
    ownedCards: number              // 소장한 카드 수
    completionRate: number          // 완성도 (0-1)
  }[]
  
  // 특별 업적
  achievements: {
    achievementId: string           // 업적 ID
    unlockedAt: Date               // 달성 일시
    title: string                  // 업적 제목
    description: string            // 업적 설명
  }[]
  
  createdAt: Date
  updatedAt: Date
}

const UserCardStatsSchema = new mongoose.Schema<IUserCardStats>({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
    // index는 unique: true로 자동 생성됨
  },
  lastDropDate: {
    type: Date,
    default: Date.now
  },
  dailyDropsUsed: {
    type: Number,
    default: 0,
    min: 0,
    max: 999
  },
  totalDropsUsed: {
    type: Number,
    default: 0,
    min: 0
  },
  totalCardsOwned: {
    type: Number,
    default: 0,
    min: 0
  },
  uniqueCardsOwned: {
    type: Number,
    default: 0,
    min: 0
  },
  totalCardsCollected: {
    type: Number,
    default: 0,
    min: 0
  },
  basicCardsOwned: {
    type: Number,
    default: 0,
    min: 0
  },
  rareCardsOwned: {
    type: Number,
    default: 0,
    min: 0
  },
  epicCardsOwned: {
    type: Number,
    default: 0,
    min: 0
  },
  legendaryCardsOwned: {
    type: Number,
    default: 0,
    min: 0
  },
  materialCardsOwned: {
    type: Number,
    default: 0,
    min: 0
  },
  craftingAttempts: {
    type: Number,
    default: 0,
    min: 0
  },
  successfulCrafts: {
    type: Number,
    default: 0,
    min: 0
  },
  failedCrafts: {
    type: Number,
    default: 0,
    min: 0
  },
  yearCardCompletion: [{
    year: {
      type: Number,
      required: true
    },
    totalCards: {
      type: Number,
      required: true,
      min: 0
    },
    ownedCards: {
      type: Number,
      required: true,
      min: 0
    },
    completionRate: {
      type: Number,
      required: true,
      min: 0,
      max: 1
    }
  }],
  achievements: [{
    achievementId: {
      type: String,
      required: true
    },
    unlockedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    title: {
      type: String,
      required: true
    },
    description: {
      type: String,
      required: true
    }
  }]
}, {
  timestamps: true
})

// 인덱스 설정 (userId는 unique: true로 자동 생성됨)
// UserCardStatsSchema.index({ userId: 1 }) - unique: true로 자동 생성됨
UserCardStatsSchema.index({ totalCardsOwned: -1 })
UserCardStatsSchema.index({ uniqueCardsOwned: -1 })

export const UserCardStats = mongoose.models.UserCardStats || mongoose.model<IUserCardStats>('UserCardStats', UserCardStatsSchema)
