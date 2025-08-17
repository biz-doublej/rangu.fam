import { Card, CardType, CardRarity } from '@/models/Card'
import { UserCard } from '@/models/UserCard'
import { CardDrop } from '@/models/CardDrop'
import { UserCardStats } from '@/models/UserCardStats'
import connectDB from '@/lib/mongodb'
import { ObjectId } from 'mongodb'

export interface CardDropResult {
  success: boolean
  card?: any
  message: string
  remainingDrops: number
}

export interface CraftingResult {
  success: boolean
  card?: any
  message: string
  usedCards: { cardId: string; quantity: number }[]
}

export class CardService {
  // 일일 카드 드랍 (5회 제한)
  static async dailyCardDrop(userId: string): Promise<CardDropResult> {
    await connectDB()
    
    try {
      const userObjectId = new ObjectId(userId)
      
      // 사용자 통계 조회/생성
      let userStats = await UserCardStats.findOne({ userId: userObjectId })
      if (!userStats) {
        userStats = new UserCardStats({
          userId: userObjectId,
          lastDropDate: new Date(),
          dailyDropsUsed: 0
        })
      }
      
      // 날짜 체크 (하루가 지났으면 드랍 횟수 리셋)
      const today = new Date()
      const lastDrop = new Date(userStats.lastDropDate)
      const isNewDay = today.toDateString() !== lastDrop.toDateString()
      
      if (isNewDay) {
        userStats.dailyDropsUsed = 0
        userStats.lastDropDate = today
      }
      
      // 무제한 드랍으로 변경 - 횟수 제한 제거
      // if (userStats.dailyDropsUsed >= 5) {
      //   return {
      //     success: false,
      //     message: '오늘 카드 드랍 횟수를 모두 사용했습니다. 내일 다시 시도해주세요.',
      //     remainingDrops: 0
      //   }
      // }
      
      // 랜덤 카드 선택
      const droppedCard = await this.selectRandomCard()
      if (!droppedCard) {
        return {
          success: false,
          message: '카드 드랍에 실패했습니다.',
          remainingDrops: 999 // 무제한으로 표시
        }
      }
      
      // 사용자 카드 인벤토리에 추가
      await this.addCardToInventory(userId, droppedCard.cardId, 'drop')
      
      // 드랍 로그 기록
      const dropLog = new CardDrop({
        userId: userObjectId,
        cardId: droppedCard.cardId,
        dropType: 'daily',
        dailyDropCount: userStats.dailyDropsUsed + 1
      })
      await dropLog.save()
      
      // 통계 업데이트
      userStats.dailyDropsUsed += 1
      userStats.totalDropsUsed += 1
      userStats.totalCardsCollected += 1
      await userStats.save()
      
      return {
        success: true,
        card: droppedCard,
        message: `${droppedCard.name} 카드를 획득했습니다!`,
        remainingDrops: 999 // 무제한으로 표시
      }
      
    } catch (error) {
      console.error('Card drop error:', error)
      return {
        success: false,
        message: '카드 드랍 중 오류가 발생했습니다.',
        remainingDrops: 0
      }
    }
  }
  
  // 확률에 따른 랜덤 카드 선택
  static async selectRandomCard(): Promise<any> {
    await connectDB()
    
    try {
      // 모든 카드 조회 (프레스티지 제외)
      const availableCards = await Card.find({
        type: { $ne: CardType.PRESTIGE }
      }).lean()
      
      console.log('Available cards count:', availableCards.length)
      
      if (availableCards.length === 0) {
        console.log('No cards found in database, creating default card...')
        // 기본 카드 생성
        const defaultCard = await this.createDefaultCard()
        return defaultCard
      }
      
      // 가중 랜덤 선택
      const totalWeight = availableCards.reduce((sum, card) => sum + card.dropRate, 0)
      console.log('Total weight:', totalWeight)
      
      if (totalWeight === 0) {
        // 모든 카드의 dropRate가 0인 경우 균등 확률로 선택
        const randomIndex = Math.floor(Math.random() * availableCards.length)
        return availableCards[randomIndex]
      }
      
      const random = Math.random() * totalWeight
      
      let currentWeight = 0
      for (const card of availableCards) {
        currentWeight += card.dropRate
        if (random <= currentWeight) {
          return card
        }
      }
      
      // 폴백으로 첫 번째 카드 반환
      return availableCards[0]
      
    } catch (error) {
      console.error('Error selecting random card:', error)
      return null
    }
  }
  
  // 기본 카드 생성 (데이터베이스에 카드가 없을 때)
  static async createDefaultCard(): Promise<any> {
    await connectDB()
    
    try {
      const defaultCard = new Card({
        cardId: 'default_jaewon_2024_h1',
        name: '재원 2024년 상반기',
        type: CardType.YEAR,
        rarity: CardRarity.BASIC,
        description: '기본 카드입니다',
        imageUrl: '/images/cards/default.jpg',
        member: '재원',
        year: 2024,
        period: 'h1',
        isGroupCard: false,
        dropRate: 0.1,
        canBeUsedForCrafting: true
      })
      
      await defaultCard.save()
      console.log('Default card created:', defaultCard.cardId)
      return defaultCard.toObject()
      
    } catch (error) {
      console.error('Error creating default card:', error)
      // 메모리상 임시 카드 반환
      return {
        cardId: 'temp_default_card',
        name: '임시 기본 카드',
        type: CardType.YEAR,
        rarity: CardRarity.BASIC,
        description: '임시 기본 카드입니다',
        imageUrl: '/images/cards/default.jpg',
        member: '재원',
        year: 2024,
        period: 'h1',
        isGroupCard: false,
        dropRate: 0.1,
        canBeUsedForCrafting: true
      }
    }
  }
  
  // 사용자 인벤토리에 카드 추가
  static async addCardToInventory(
    userId: string, 
    cardId: string, 
    acquiredBy: 'drop' | 'craft' | 'gift' | 'admin' = 'drop'
  ): Promise<void> {
    await connectDB()
    
    try {
      const userObjectId = new ObjectId(userId)
      
      // 기존 카드 조회
      const existingCard = await UserCard.findOne({ 
        userId: userObjectId, 
        cardId 
      })
      
      if (existingCard) {
        // 기존 카드 수량 증가
        existingCard.quantity += 1
        existingCard.acquiredAt = new Date()
        await existingCard.save()
      } else {
        // 새 카드 추가
        const newUserCard = new UserCard({
          userId: userObjectId,
          cardId,
          quantity: 1,
          acquiredBy
        })
        await newUserCard.save()
      }
      
      // 사용자 통계 업데이트
      await this.updateUserStats(userId)
      
    } catch (error) {
      console.error('Error adding card to inventory:', error)
      throw error
    }
  }
  
  // 사용자 통계 업데이트
  static async updateUserStats(userId: string): Promise<void> {
    await connectDB()
    
    try {
      const userObjectId = new ObjectId(userId)
      
      // 사용자 카드 집계
      const cardStats = await UserCard.aggregate([
        { $match: { userId: userObjectId } },
        {
          $lookup: {
            from: 'cards',
            localField: 'cardId',
            foreignField: 'cardId',
            as: 'cardInfo'
          }
        },
        { $unwind: '$cardInfo' },
        {
          $group: {
            _id: null,
            totalCards: { $sum: '$quantity' },
            uniqueCards: { $sum: 1 },
            basicCards: {
              $sum: {
                $cond: [
                  { $eq: ['$cardInfo.rarity', CardRarity.BASIC] },
                  '$quantity',
                  0
                ]
              }
            },
            rareCards: {
              $sum: {
                $cond: [
                  { $eq: ['$cardInfo.rarity', CardRarity.RARE] },
                  '$quantity',
                  0
                ]
              }
            },
            epicCards: {
              $sum: {
                $cond: [
                  { $eq: ['$cardInfo.rarity', CardRarity.EPIC] },
                  '$quantity',
                  0
                ]
              }
            },
            legendaryCards: {
              $sum: {
                $cond: [
                  { $eq: ['$cardInfo.rarity', CardRarity.LEGENDARY] },
                  '$quantity',
                  0
                ]
              }
            },
            materialCards: {
              $sum: {
                $cond: [
                  { $eq: ['$cardInfo.rarity', CardRarity.MATERIAL] },
                  '$quantity',
                  0
                ]
              }
            }
          }
        }
      ])
      
      const stats = cardStats[0] || {
        totalCards: 0,
        uniqueCards: 0,
        basicCards: 0,
        rareCards: 0,
        epicCards: 0,
        legendaryCards: 0,
        materialCards: 0
      }
      
      // 사용자 통계 업데이트
      await UserCardStats.findOneAndUpdate(
        { userId: userObjectId },
        {
          $set: {
            totalCardsOwned: stats.totalCards,
            uniqueCardsOwned: stats.uniqueCards,
            basicCardsOwned: stats.basicCards,
            rareCardsOwned: stats.rareCards,
            epicCardsOwned: stats.epicCards,
            legendaryCardsOwned: stats.legendaryCards,
            materialCardsOwned: stats.materialCards
          }
        },
        { upsert: true }
      )
      
    } catch (error) {
      console.error('Error updating user stats:', error)
      throw error
    }
  }
  
  // 사용자 인벤토리 조회
  static async getUserInventory(userId: string, page: number = 1, limit: number = 20) {
    await connectDB()
    
    try {
      const userObjectId = new ObjectId(userId)
      const skip = (page - 1) * limit
      
      const inventory = await UserCard.aggregate([
        { $match: { userId: userObjectId } },
        {
          $lookup: {
            from: 'cards',
            localField: 'cardId',
            foreignField: 'cardId',
            as: 'cardInfo'
          }
        },
        { $unwind: '$cardInfo' },
        { $sort: { acquiredAt: -1 } },
        { $skip: skip },
        { $limit: limit }
      ])
      
      const totalCount = await UserCard.countDocuments({ userId: userObjectId })
      
      return {
        cards: inventory,
        totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit)
      }
      
    } catch (error) {
      console.error('Error getting user inventory:', error)
      throw error
    }
  }
  
  // 프레스티지 카드 조합
  static async craftPrestigeCard(
    userId: string,
    useMaterialCard: boolean = false
  ): Promise<CraftingResult> {
    await connectDB()
    
    try {
      const userObjectId = new ObjectId(userId)
      
      // 사용자 인벤토리 조회
      const userCards = await UserCard.find({ userId: userObjectId }).lean()
      const cardCounts = userCards.reduce((acc, card) => {
        acc[card.cardId] = card.quantity
        return acc
      }, {} as Record<string, number>)
      
      // 카드 정보 조회
      const allCards = await Card.find().lean()
      const cardMap = allCards.reduce((acc, card) => {
        acc[card.cardId] = card
        return acc
      }, {} as Record<string, any>)
      
      let usedCards: { cardId: string; quantity: number }[] = []
      let canCraft = false
      
      if (useMaterialCard) {
        // 재료 카드 사용 (무한 조합)
        const materialCards = Object.keys(cardCounts).filter(cardId => 
          cardMap[cardId]?.type === CardType.MATERIAL && cardCounts[cardId] > 0
        )
        
        if (materialCards.length > 0) {
          canCraft = true
          // 재료 카드는 소모되지 않음
        }
      } else {
        // 일반 카드 조합 (년도 7개 + 스페셜 3개 + 시그니처 1개)
        const yearCards = Object.keys(cardCounts).filter(cardId => 
          cardMap[cardId]?.type === CardType.YEAR && cardCounts[cardId] > 0
        )
        const specialCards = Object.keys(cardCounts).filter(cardId => 
          cardMap[cardId]?.type === CardType.SPECIAL && cardCounts[cardId] > 0
        )
        const signatureCards = Object.keys(cardCounts).filter(cardId => 
          cardMap[cardId]?.type === CardType.SIGNATURE && cardCounts[cardId] > 0
        )
        
        const availableYearCount = yearCards.reduce((sum, cardId) => sum + cardCounts[cardId], 0)
        const availableSpecialCount = specialCards.reduce((sum, cardId) => sum + cardCounts[cardId], 0)
        const availableSignatureCount = signatureCards.reduce((sum, cardId) => sum + cardCounts[cardId], 0)
        
        if (availableYearCount >= 7 && availableSpecialCount >= 3 && availableSignatureCount >= 1) {
          canCraft = true
          
          // 사용할 카드 선정
          let yearUsed = 0
          for (const cardId of yearCards) {
            if (yearUsed >= 7) break
            const useCount = Math.min(cardCounts[cardId], 7 - yearUsed)
            usedCards.push({ cardId, quantity: useCount })
            yearUsed += useCount
          }
          
          let specialUsed = 0
          for (const cardId of specialCards) {
            if (specialUsed >= 3) break
            const useCount = Math.min(cardCounts[cardId], 3 - specialUsed)
            usedCards.push({ cardId, quantity: useCount })
            specialUsed += useCount
          }
          
          usedCards.push({ cardId: signatureCards[0], quantity: 1 })
        }
      }
      
      if (!canCraft) {
        return {
          success: false,
          message: '조합에 필요한 카드가 부족합니다.',
          usedCards: []
        }
      }
      
      // 조합 시도 (70% 성공률)
      const isSuccess = Math.random() < 0.7
      
      // 조합 로그 기록
      const dropLog = new CardDrop({
        userId: userObjectId,
        cardId: isSuccess ? 'prestige_random' : 'craft_fail',
        dropType: 'craft',
        dailyDropCount: 0,
        craftingAttempt: {
          usedCards,
          wasSuccessful: isSuccess
        }
      })
      await dropLog.save()
      
      // 사용된 카드 제거 (재료 카드 제외)
      if (!useMaterialCard && usedCards.length > 0) {
        for (const { cardId, quantity } of usedCards) {
          await UserCard.findOneAndUpdate(
            { userId: userObjectId, cardId },
            { $inc: { quantity: -quantity } }
          )
          
          // 수량이 0이 되면 삭제
          await UserCard.deleteMany({ userId: userObjectId, quantity: { $lte: 0 } })
        }
      }
      
      // 통계 업데이트
      const userStats = await UserCardStats.findOne({ userId: userObjectId })
      if (userStats) {
        userStats.craftingAttempts += 1
        if (isSuccess) {
          userStats.successfulCrafts += 1
        } else {
          userStats.failedCrafts += 1
        }
        await userStats.save()
      }
      
      if (isSuccess) {
        // 랜덤 프레스티지 카드 지급 (17.5% 멤버 카드, 나머지는 특별 프레스티지)
        const isPersonalCard = Math.random() < 0.175
        const prestigeCardId = isPersonalCard ? 
          `prestige_${['jaewon', 'minseok', 'jinkyu', 'hanul', 'seungchan', 'heeyeol'][Math.floor(Math.random() * 6)]}` :
          'prestige_group_special'
        
        await this.addCardToInventory(userId, prestigeCardId, 'craft')
        
        // 프레스티지 카드 정보 조회
        const prestigeCard = await Card.findOne({ cardId: prestigeCardId }).lean()
        
        return {
          success: true,
          card: prestigeCard,
          message: `축하합니다! ${(prestigeCard as any)?.name || '프레스티지 카드'}를 획득했습니다!`,
          usedCards
        }
      } else {
        return {
          success: false,
          message: '조합에 실패했습니다. 사용된 카드들이 사라졌습니다.',
          usedCards
        }
      }
      
    } catch (error) {
      console.error('Crafting error:', error)
      return {
        success: false,
        message: '조합 중 오류가 발생했습니다.',
        usedCards: []
      }
    }
  }
  
  // 사용자의 오늘 남은 드랍 횟수 조회 (무제한으로 변경)
  static async getRemainingDrops(userId: string): Promise<number> {
    await connectDB()
    
    try {
      // 무제한 드랍으로 변경
      return 999
      
    } catch (error) {
      console.error('Error getting remaining drops:', error)
      return 999
    }
  }
}
