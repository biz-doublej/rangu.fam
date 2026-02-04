import { createHash } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import connectDB from '@/lib/mongodb'
import { CardDrop } from '@/models/CardDrop'
import { Card } from '@/models/Card'
import { WikiUser } from '@/models/Wiki'
import { resolveMemberIdForUser } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

const FALLBACK_IMAGE = '/images/default-music-cover.jpg'
const TARGET_MEMBER_IDS = new Set(['hanul', 'jaewon', 'jinkyu', 'seungchan', 'minseok'])
const MEMBER_ID_TO_NAME: Record<string, string> = {
  hanul: '강한울',
  jaewon: '정재원',
  jinkyu: '정진규',
  seungchan: '이승찬',
  minseok: '정민석'
}

const MEMBER_SEEDS: Record<string, string[]> = {
  hanul: ['hanul', 'k.seoljin', 'kanghu05', 'HAN'],
  jaewon: ['jaewon', 'gabrieljung0727', 'gabriel0727', 'JAE'],
  jinkyu: ['jinkyu', 'jingyu', 'jinq09012239', 'JIN'],
  seungchan: ['seungchan', 'sd_kim.h.s', 'LEE'],
  minseok: ['minseok', 'txxse0k', 'seoko1752', 'MIN']
}

const toObjectId = (seed: string) => {
  if (mongoose.Types.ObjectId.isValid(seed) && seed.length === 24) {
    return new mongoose.Types.ObjectId(seed)
  }
  const hex = createHash('md5').update(seed || 'guest').digest('hex').slice(0, 24)
  return new mongoose.Types.ObjectId(hex)
}

const toHex = (value: mongoose.Types.ObjectId | string) =>
  typeof value === 'string' ? value : value.toHexString()

type ActivityType = 'drop' | 'craft' | 'upgrade'

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const rawLimit = Number(searchParams.get('limit') || 40)
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 10), 120) : 40

    const targetMemberByUserId = new Map<string, string>()

    // 실사용 계정 기준 멤버 매핑
    const users = await WikiUser.find({})
      .select('_id username discordUsername discordId isActive')
      .lean<any[]>()

    for (const user of users) {
      const memberId = resolveMemberIdForUser(user)
      if (!memberId || !TARGET_MEMBER_IDS.has(memberId)) continue
      targetMemberByUserId.set(toHex(String(user._id)), memberId)
    }

    // 과거 normalizeUserId(seed) 기반 로그도 포함
    for (const [memberId, seeds] of Object.entries(MEMBER_SEEDS)) {
      for (const seed of seeds) {
        targetMemberByUserId.set(toObjectId(seed).toHexString(), memberId)
      }
    }

    const targetUserObjectIds = Array.from(targetMemberByUserId.keys()).map(
      (hex) => new mongoose.Types.ObjectId(hex)
    )

    if (!targetUserObjectIds.length) {
      return NextResponse.json({ success: true, activities: [] })
    }

    const logs = await CardDrop.find({
      userId: { $in: targetUserObjectIds },
      $or: [
        { dropType: 'daily' },
        { dropType: 'craft', cardId: { $ne: 'craft_fail' } }
      ]
    })
      .sort({ droppedAt: -1, createdAt: -1 })
      .limit(limit)
      .lean<any[]>()

    if (!logs.length) {
      return NextResponse.json({ success: true, activities: [] })
    }

    const cardIds = Array.from(
      new Set(
        logs
          .map((log) => String(log.cardId || ''))
          .filter((cardId) => cardId && cardId !== 'craft_fail')
      )
    )

    const cards = await Card.find({ cardId: { $in: cardIds } })
      .select('cardId name imageUrl rarity')
      .lean<any[]>()

    const cardById = new Map(cards.map((card) => [card.cardId, card]))

    const activities = logs.map((log) => {
      const userIdHex = toHex(log.userId as mongoose.Types.ObjectId)
      const memberId = targetMemberByUserId.get(userIdHex) || ''
      const memberName = MEMBER_ID_TO_NAME[memberId] || '랑구팸 멤버'
      const usedCardsCount = Array.isArray(log.craftingAttempt?.usedCards)
        ? log.craftingAttempt.usedCards.length
        : 0

      let activityType: ActivityType = 'drop'
      if (log.dropType === 'craft') {
        activityType = usedCardsCount > 0 ? 'craft' : 'upgrade'
      }

      const cardId = String(log.cardId || '')
      const card = cardById.get(cardId)
      const cardName =
        card?.name ||
        (cardId === 'prestige_random' ? '프레스티지 카드' : cardId || '알 수 없는 카드')

      return {
        id: String(log._id),
        memberId,
        memberName,
        activityType,
        activityLabel:
          activityType === 'drop' ? '드롭' : activityType === 'craft' ? '제작' : '강화',
        cardId,
        cardName,
        cardImageUrl: card?.imageUrl || FALLBACK_IMAGE,
        cardRarity: card?.rarity || null,
        droppedAt: log.droppedAt || log.createdAt
      }
    })

    return NextResponse.json({
      success: true,
      activities
    })
  } catch (error) {
    console.error('Recent card activity error:', error)
    return NextResponse.json(
      { success: false, message: '최근 카드 활동을 불러오지 못했습니다.' },
      { status: 500 }
    )
  }
}

