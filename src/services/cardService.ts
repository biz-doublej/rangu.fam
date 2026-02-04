import { createHash } from 'crypto'
import fs from 'fs'
import path from 'path'
import { Card, CardType, CardRarity } from '@/models/Card'
import { UserCard } from '@/models/UserCard'
import { CardDrop } from '@/models/CardDrop'
import { UserCardStats } from '@/models/UserCardStats'
import connectDB from '@/lib/mongodb'
import { ObjectId } from 'mongodb'
import { CardCatalogService } from '@/services/cardCatalogService'

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
  usedCardDetails?: { cardId: string; name: string; quantity: number; imageUrl?: string }[]
}

export class CardService {
  static readonly FALLBACK_IMAGE = '/images/default-music-cover.jpg'
  static readonly MAX_DROPS_PER_WINDOW = 5
  static readonly DROP_WINDOW_MS = 24 * 60 * 60 * 1000

  private static shouldResetDropWindow(lastDropDate?: Date | string | null, now: Date = new Date()) {
    if (!lastDropDate) return true
    const parsed = new Date(lastDropDate)
    if (Number.isNaN(parsed.getTime())) return true
    const elapsedMs = now.getTime() - parsed.getTime()
    return elapsedMs >= this.DROP_WINDOW_MS || elapsedMs < 0
  }

  private static getMemberKey(value?: string) {
    if (!value) return undefined
    const compact = value.replace(/\s+/g, '')
    if (compact.includes('강한울') || /HAN/i.test(compact)) return 'HAN'
    if (compact.includes('정재원') || /JAE/i.test(compact)) return 'JAE'
    if (compact.includes('정진규') || /JIN/i.test(compact)) return 'JIN'
    if (compact.includes('이승찬') || /LEE/i.test(compact)) return 'LEE'
    if (compact.includes('정민석') || /MIN/i.test(compact)) return 'MIN'
    return undefined
  }

  private static inferVersion(card: any) {
    if (card?.period === 'h1') return 1
    if (card?.period === 'h2') return 2
    const source = `${card?.cardId || ''} ${card?.name || ''} ${card?.imageUrl || ''}`.toLowerCase()
    if (/(?:^|[_\s-])v1(?:$|[_\s.-])/.test(source) || source.includes('버전1')) return 1
    if (/(?:^|[_\s-])v2(?:$|[_\s.-])/.test(source) || source.includes('버전2')) return 2
    return undefined
  }

  private static inferYear(card: any) {
    if (card?.year && card.year > 1900) return Number(card.year)
    const source = `${card?.cardId || ''} ${card?.name || ''} ${card?.imageUrl || ''}`
    const fullYearMatch = source.match(/(19|20)\d{2}/)
    if (fullYearMatch) return Number(fullYearMatch[0])
    const shortYearMatch = source.match(/_(\d{2})_V[12]/i)
    if (shortYearMatch) {
      const shortYear = Number(shortYearMatch[1])
      return shortYear >= 70 ? 1900 + shortYear : 2000 + shortYear
    }
    return undefined
  }

  private static buildDropDedupKey(card: any) {
    const type = String(card?.type || '')
    const memberKey =
      this.getMemberKey(card?.member) ||
      this.getMemberKey(card?.cardId) ||
      this.getMemberKey(card?.name)
    const year = this.inferYear(card)
    const version = this.inferVersion(card)
    const imageUrl = String(card?.imageUrl || '').toLowerCase()

    if (type === CardType.YEAR) {
      return `year:${memberKey || 'unknown'}:${year || 'unknown'}:${version || 'unknown'}`
    }
    if (type === CardType.SIGNATURE) {
      return `signature:${memberKey || 'unknown'}:${year || 'unknown'}`
    }
    if (type === CardType.SPECIAL) {
      return `special:${imageUrl || card?.cardId || 'unknown'}`
    }
    if (type === CardType.MATERIAL) {
      return `material:${imageUrl || card?.cardId || 'unknown'}`
    }
    return `${type}:${card?.cardId || 'unknown'}`
  }

  private static getDropCandidateScore(card: any) {
    let score = Number(card?.dropRate || 0)
    const cardId = String(card?.cardId || '')
    const imageUrl = String(card?.imageUrl || '')

    if (/^[A-Z]{3}_\d{4}_v[12]$/i.test(cardId)) score += 2
    if (/^SIG_[A-Z]{3}_\d{4}$/i.test(cardId)) score += 2
    if (!cardId.startsWith('year_') && !cardId.startsWith('signature_') && !cardId.startsWith('special_')) {
      score += 1
    }
    if (imageUrl.includes('/BG_') || imageUrl.includes('BG_SIGNATURE')) {
      score -= 1.5
    }

    return score
  }

  // Normalize arbitrary user identifiers (e.g. Discord) into a stable ObjectId
  static normalizeUserId(rawId: string): ObjectId {
    if (rawId && ObjectId.isValid(rawId) && rawId.length === 24) {
      return new ObjectId(rawId)
    }
    const seed = rawId || 'guest'
    const hexId = createHash('md5').update(seed).digest('hex').slice(0, 24)
    return new ObjectId(hexId)
  }

  // 이미지가 존재하지 않으면 공통 대체 이미지로 치환
  static ensureImage(card: any) {
    if (!card?.imageUrl) {
      return { ...card, imageUrl: this.FALLBACK_IMAGE }
    }
    const relativePath = card.imageUrl.startsWith('/')
      ? card.imageUrl.slice(1)
      : card.imageUrl
    const absolutePath = path.join(process.cwd(), 'public', relativePath)
    if (!fs.existsSync(absolutePath)) {
      return { ...card, imageUrl: this.FALLBACK_IMAGE }
    }
    return card
  }

  // 일일 카드 드랍 (5회 제한)
  static async dailyCardDrop(userId: string): Promise<CardDropResult> {
    await connectDB()
    
    try {
      const userObjectId = this.normalizeUserId(userId)
      
      // 사용자 통계 조회/생성 (upsert로 중복 생성 방지)
      const userStats = await UserCardStats.findOneAndUpdate(
        { userId: userObjectId },
        {
          $setOnInsert: {
            userId: userObjectId,
            lastDropDate: new Date(),
            dailyDropsUsed: 0,
            totalDropsUsed: 0,
            totalCardsCollected: 0
          }
        },
        { upsert: true, new: true }
      )

      if (!userStats) {
        throw new Error('사용자 카드 통계를 초기화하지 못했습니다.')
      }
      
      const now = new Date()

      // 24시간 경과 시 자동 리셋
      if (this.shouldResetDropWindow(userStats.lastDropDate, now)) {
        userStats.dailyDropsUsed = 0
        userStats.lastDropDate = now
      }

      if (userStats.dailyDropsUsed >= this.MAX_DROPS_PER_WINDOW) {
        return {
          success: false,
          message: '24시간 동안 사용 가능한 드랍 5회를 모두 사용했습니다. 자동 초기화를 기다려주세요.',
          remainingDrops: 0
        }
      }

      // 현재 24시간 윈도우의 시작점 기록
      if (userStats.dailyDropsUsed === 0) {
        userStats.lastDropDate = now
      }
      
      // 랜덤 카드 선택
      const droppedCard = this.ensureImage(await this.selectRandomCard())
      if (!droppedCard) {
        const remainingOnFail = Math.max(
          0,
          this.MAX_DROPS_PER_WINDOW - Number(userStats.dailyDropsUsed || 0)
        )
        return {
          success: false,
          message: '카드 드랍에 실패했습니다.',
          remainingDrops: remainingOnFail
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
      const remainingDrops = Math.max(
        0,
        this.MAX_DROPS_PER_WINDOW - Number(userStats.dailyDropsUsed || 0)
      )
      
      return {
        success: true,
        card: droppedCard,
        message: `카드를 획득했습니다! 남은 드랍 ${remainingDrops}회`,
        remainingDrops
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
      const loadDropCandidates = async () => {
        const cards = await Card.find({
          type: { $ne: CardType.PRESTIGE },
          dropRate: { $gt: 0 }
        }).lean()

        const validCards = cards
          .map((card) => this.ensureImage(card))
          .filter((card) => card.imageUrl !== this.FALLBACK_IMAGE)

        const deduped = new Map<string, any>()
        for (const card of validCards) {
          const key = this.buildDropDedupKey(card)
          const existing = deduped.get(key)
          if (!existing) {
            deduped.set(key, { ...card })
            continue
          }

          const chosen =
            this.getDropCandidateScore(card) > this.getDropCandidateScore(existing)
              ? { ...card }
              : existing
          chosen.dropRate = Number(existing.dropRate || 0) + Number(card.dropRate || 0)
          deduped.set(key, chosen)
        }

        return Array.from(deduped.values())
      }

      // 모든 카드 조회 (프레스티지 제외 + 실제 이미지 존재 카드만 사용)
      let availableCards = await loadDropCandidates()
      
      console.log('Available cards count:', availableCards.length)
      
      if (availableCards.length === 0) {
        console.log('No valid drop cards found, syncing from local card images...')
        await CardCatalogService.syncCardsFromLocalImages()
        availableCards = await loadDropCandidates()
      }

      if (availableCards.length === 0) {
        console.log('No cards available after sync, creating default card...')
        const defaultCard = await this.createDefaultCard()
        return this.ensureImage(defaultCard)
      }
      
      // 가중 랜덤 선택
      const totalWeight = availableCards.reduce((sum, card) => sum + card.dropRate, 0)
      console.log('Total weight:', totalWeight)
      
      if (totalWeight === 0) {
        // 모든 카드의 dropRate가 0인 경우 균등 확률로 선택
        const randomIndex = Math.floor(Math.random() * availableCards.length)
        return this.ensureImage(availableCards[randomIndex])
      }
      
      const random = Math.random() * totalWeight
      
      let currentWeight = 0
      for (const card of availableCards) {
        currentWeight += card.dropRate
        if (random <= currentWeight) {
          return this.ensureImage(card)
        }
      }
      
      // 폴백으로 첫 번째 카드 반환
      return this.ensureImage(availableCards[0])
      
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
        imageUrl: this.FALLBACK_IMAGE,
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
        imageUrl: this.FALLBACK_IMAGE,
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
      const userObjectId = this.normalizeUserId(userId)
      
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
      const userObjectId = this.normalizeUserId(userId)
      
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
      const userObjectId = this.normalizeUserId(userId)
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
      const userObjectId = this.normalizeUserId(userId)
      
      // 잠금 카드 제외: 제작/강화에 사용할 수 있는 카드만 조회
      const userCards = await UserCard.find({
        userId: userObjectId,
        isLocked: { $ne: true },
        quantity: { $gt: 0 }
      }).lean()
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
      const buildUsedCardDetails = (source: { cardId: string; quantity: number }[]) =>
        source.map(({ cardId, quantity }) => {
          const cardInfo = cardMap[cardId]
          const ensuredCard = cardInfo ? this.ensureImage(cardInfo) : null
          return {
            cardId,
            name: cardInfo?.name || '알 수 없는 카드',
            quantity,
            imageUrl: ensuredCard?.imageUrl
          }
        })
      
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
          message: '조합에 필요한 카드가 부족합니다. (잠금 카드는 제외됩니다.)',
          usedCards: [],
          usedCardDetails: []
        }
      }
      
      // 조합 시도 (70% 성공률)
      const isSuccess = Math.random() < 0.7
      
      // 조합 로그 기록
      const dropLog = new CardDrop({
        userId: userObjectId,
        cardId: isSuccess ? 'prestige_random' : 'craft_fail',
        dropType: 'craft',
        dailyDropCount: 1,
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
            { userId: userObjectId, cardId, isLocked: { $ne: true } },
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
        const prestigePool = ['jaewon', 'minseok', 'jinkyu', 'hanul', 'seungchan']
        let prestigeCardId = isPersonalCard 
          ? `prestige_${prestigePool[Math.floor(Math.random() * prestigePool.length)]}` 
          : 'prestige_group_special'

        // 프레스티지 카드 정보 조회 (없으면 이미지 카탈로그 동기화 후 재시도)
        let prestigeCard: any = await Card.findOne({ cardId: prestigeCardId }).lean()
        if (!prestigeCard) {
          await CardCatalogService.syncCardsFromLocalImages()
          prestigeCard = await Card.findOne({ cardId: prestigeCardId }).lean()
        }

        // 여전히 없으면 사용 가능한 프레스티지 카드로 대체
        if (!prestigeCard) {
          prestigeCard = await Card.findOne({ type: CardType.PRESTIGE }).lean()
          if (prestigeCard) {
            prestigeCardId = prestigeCard.cardId
          }
        }

        if (!prestigeCard) {
          throw new Error('프레스티지 카드 데이터를 찾을 수 없습니다.')
        }

        // 최근 획득 피드에서 실제 카드명을 보여주기 위해 성공 로그를 실제 카드 ID로 교정
        await CardDrop.updateOne(
          { _id: dropLog._id },
          { $set: { cardId: prestigeCardId } }
        )

        await this.addCardToInventory(userId, prestigeCardId, 'craft')
        const ensuredPrestigeCard = this.ensureImage(prestigeCard)
        
        return {
          success: true,
          card: ensuredPrestigeCard,
          message: `축하합니다! ${(ensuredPrestigeCard as any)?.name || '프레스티지 카드'}를 획득했습니다!`,
          usedCards,
          usedCardDetails: buildUsedCardDetails(usedCards)
        }
      } else {
        return {
          success: false,
          message: '조합에 실패했습니다. 사용된 카드들이 사라졌습니다.',
          usedCards,
          usedCardDetails: buildUsedCardDetails(usedCards)
        }
      }
      
    } catch (error) {
      console.error('Crafting error:', error)
      return {
        success: false,
        message: '조합 중 오류가 발생했습니다.',
        usedCards: [],
        usedCardDetails: []
      }
    }
  }
  
  // 사용자의 남은 드랍 횟수 조회 (24시간당 5회)
  static async getRemainingDrops(userId: string): Promise<number> {
    await connectDB()
    
    try {
      const userObjectId = this.normalizeUserId(userId)
      const userStats = await UserCardStats.findOne({ userId: userObjectId })

      if (!userStats) {
        return this.MAX_DROPS_PER_WINDOW
      }

      if (this.shouldResetDropWindow(userStats.lastDropDate)) {
        userStats.dailyDropsUsed = 0
        userStats.lastDropDate = new Date()
        await userStats.save()
      }

      return Math.max(0, this.MAX_DROPS_PER_WINDOW - Number(userStats.dailyDropsUsed || 0))
      
    } catch (error) {
      console.error('Error getting remaining drops:', error)
      return 0
    }
  }
}
