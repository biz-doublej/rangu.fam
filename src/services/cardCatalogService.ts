import fs from 'fs'
import path from 'path'
import { Card, CardRarity, CardType } from '@/models/Card'
import { UserCard } from '@/models/UserCard'
import { CardDrop } from '@/models/CardDrop'

type GeneratedCard = {
  cardId: string
  name: string
  type: CardType
  rarity: CardRarity
  description: string
  imageUrl: string
  member?: string
  year?: number
  period?: 'h1' | 'h2'
  isGroupCard?: boolean
  dropRate: number
  maxCopies?: number
  canBeUsedForCrafting: boolean
}

type SyncResult = {
  generatedCount: number
  upsertedCount: number
  generatedCards: GeneratedCard[]
}

const CARD_ROOT = path.join(process.cwd(), 'public', 'images', 'cards')
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp'])

const MEMBER_CODE_TO_NAME: Record<string, string> = {
  HAN: '강한울',
  JAE: '정재원',
  JIN: '정진규',
  LEE: '이승찬',
  MIN: '정민석'
}

const MEMBER_NAME_TO_CODE: Record<string, string> = {
  강한울: 'HAN',
  정재원: 'JAE',
  정진규: 'JIN',
  이승찬: 'LEE',
  정민석: 'MIN'
}

const MEMBER_CODE_TO_ID: Record<string, string> = {
  HAN: 'hanul',
  JAE: 'jaewon',
  JIN: 'jinkyu',
  LEE: 'seungchan',
  MIN: 'minseok'
}

const typeRateBudget: Record<CardType, number> = {
  [CardType.YEAR]: 0.55,
  [CardType.SPECIAL]: 0.25,
  [CardType.SIGNATURE]: 0.15,
  [CardType.MATERIAL]: 0.05,
  [CardType.PRESTIGE]: 0
}

const toSlug = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

const toFullYear = (shortYear: number) => {
  if (shortYear >= 70) return 1900 + shortYear
  return 2000 + shortYear
}

const listImageFiles = (folder: string) => {
  const directoryPath = path.join(CARD_ROOT, folder)
  if (!fs.existsSync(directoryPath)) return []

  return fs
    .readdirSync(directoryPath, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()))
}

const toImageUrl = (folder: string, filename: string) => `/images/cards/${folder}/${filename}`

const parseYearCards = (): GeneratedCard[] => {
  const files = listImageFiles('year')
  const yearCards: GeneratedCard[] = []

  for (const filename of files) {
    const match = filename.match(/^([A-Z]{3})_(\d{2})_V([12])\.(jpg|jpeg|png|webp)$/i)
    if (!match) continue

    const memberCode = match[1].toUpperCase()
    const shortYear = Number(match[2])
    const version = Number(match[3])
    const fullYear = toFullYear(shortYear)
    const memberName = MEMBER_CODE_TO_NAME[memberCode]
    if (!memberName) continue

    yearCards.push({
      cardId: `${memberCode}_${fullYear}_v${version}`,
      name: `${memberName} ${fullYear} v${version}`,
      type: CardType.YEAR,
      rarity: CardRarity.BASIC,
      description: `${fullYear}년 ${memberName} 카드 v${version}`,
      imageUrl: toImageUrl('year', filename),
      member: memberName,
      year: fullYear,
      period: version === 1 ? 'h1' : 'h2',
      isGroupCard: false,
      dropRate: 0,
      canBeUsedForCrafting: true
    })
  }

  return yearCards
}

const parseSignatureCards = (): GeneratedCard[] => {
  const files = listImageFiles('signature')
  const signatureCards: GeneratedCard[] = []

  for (const filename of files) {
    const match = filename.match(/^SIG_([A-Z]{3})_(\d{2})\.(jpg|jpeg|png|webp)$/i)
    if (!match) continue

    const memberCode = match[1].toUpperCase()
    const shortYear = Number(match[2])
    const fullYear = toFullYear(shortYear)
    const memberName = MEMBER_CODE_TO_NAME[memberCode]
    if (!memberName) continue

    signatureCards.push({
      cardId: `SIG_${memberCode}_${fullYear}`,
      name: `${memberName} ${fullYear} 시그니처`,
      type: CardType.SIGNATURE,
      rarity: CardRarity.EPIC,
      description: `${fullYear}년 ${memberName} 시그니처 카드`,
      imageUrl: toImageUrl('signature', filename),
      member: memberName,
      year: fullYear,
      isGroupCard: false,
      dropRate: 0,
      canBeUsedForCrafting: true
    })
  }

  return signatureCards
}

const toSpecialCardName = (baseName: string, memberName?: string, fullYear?: number) => {
  const upper = baseName.toUpperCase()

  if (upper.startsWith('SC_') && memberName && fullYear) {
    return `${memberName} 스페셜 ${fullYear}`
  }
  if (upper.startsWith('BACKNUM_') && memberName) {
    return `${memberName} 백넘버`
  }
  if (upper.startsWith('KIATIGERS_') && memberName) {
    return `${memberName} KIA 타이거즈`
  }
  if (upper.startsWith('LGTWINS_') && memberName) {
    return `${memberName} LG 트윈스`
  }
  if (upper === 'RANGGU_ANNIVER') {
    return '랑구 애니버서리'
  }
  if (upper === 'RANGGU_SPECIAL') {
    return '랑구 스페셜'
  }

  return baseName.replace(/_/g, ' ')
}

const parseSpecialCards = (): GeneratedCard[] => {
  const files = listImageFiles('special')
  const specialCards: GeneratedCard[] = []

  for (const filename of files) {
    const ext = path.extname(filename)
    const baseName = path.basename(filename, ext)
    if (/^BG_/i.test(baseName)) continue

    const memberMatch = baseName.match(/(?:^|_)(HAN|JAE|JIN|LEE|MIN)(?:_|$)/i)
    const yearMatch = baseName.match(/_(\d{2})(?:_|$)/)

    const memberCode = memberMatch?.[1]?.toUpperCase()
    const memberName = memberCode ? MEMBER_CODE_TO_NAME[memberCode] : undefined
    const shortYear = yearMatch ? Number(yearMatch[1]) : undefined
    const fullYear = shortYear !== undefined ? toFullYear(shortYear) : undefined

    specialCards.push({
      cardId: baseName.toUpperCase(),
      name: toSpecialCardName(baseName, memberName, fullYear),
      type: CardType.SPECIAL,
      rarity: CardRarity.RARE,
      description: `${toSpecialCardName(baseName, memberName, fullYear)} 카드`,
      imageUrl: toImageUrl('special', filename),
      member: memberName,
      year: fullYear,
      isGroupCard: !memberName,
      dropRate: 0,
      canBeUsedForCrafting: true
    })
  }

  return specialCards
}

const parseMaterialCards = (): GeneratedCard[] => {
  const files = listImageFiles('material')
  const materialCards: GeneratedCard[] = []

  for (const filename of files) {
    const ext = path.extname(filename)
    const baseName = path.basename(filename, ext)
    if (/^BG_/i.test(baseName)) continue

    materialCards.push({
      cardId: baseName.toUpperCase(),
      name: `${baseName.replace(/_/g, ' ')} 재료`,
      type: CardType.MATERIAL,
      rarity: CardRarity.MATERIAL,
      description: `${baseName.replace(/_/g, ' ')} 재료 카드`,
      imageUrl: toImageUrl('material', filename),
      isGroupCard: true,
      dropRate: 0,
      canBeUsedForCrafting: true
    })
  }

  return materialCards
}

const parsePrestigeCards = (): GeneratedCard[] => {
  const files = listImageFiles('prestige')
  const prestigeCards: GeneratedCard[] = []

  for (const filename of files) {
    const ext = path.extname(filename)
    const baseName = path.basename(filename, ext).toUpperCase()

    if (baseName === 'PGBG') {
      prestigeCards.push({
        cardId: 'prestige_group_special',
        name: '랑구 프레스티지',
        type: CardType.PRESTIGE,
        rarity: CardRarity.LEGENDARY,
        description: '랑구 전체의 추억이 담긴 프레스티지 카드',
        imageUrl: toImageUrl('prestige', filename),
        isGroupCard: true,
        dropRate: 0,
        maxCopies: 1,
        canBeUsedForCrafting: false
      })
      continue
    }

    const match = baseName.match(/^BG_(HAN|JAE|JIN|LEE|MIN)_PRE$/)
    if (!match) continue

    const memberCode = match[1]
    const memberName = MEMBER_CODE_TO_NAME[memberCode]
    const memberId = MEMBER_CODE_TO_ID[memberCode]
    if (!memberName || !memberId) continue

    prestigeCards.push({
      cardId: `prestige_${memberId}`,
      name: `${memberName} 프레스티지`,
      type: CardType.PRESTIGE,
      rarity: CardRarity.LEGENDARY,
      description: `${memberName}의 특별한 프레스티지 카드`,
      imageUrl: toImageUrl('prestige', filename),
      member: memberName,
      isGroupCard: false,
      dropRate: 0,
      maxCopies: 1,
      canBeUsedForCrafting: false
    })
  }

  return prestigeCards
}

const applyDropRates = (cards: GeneratedCard[]) => {
  for (const type of [CardType.YEAR, CardType.SPECIAL, CardType.SIGNATURE, CardType.MATERIAL]) {
    const typedCards = cards.filter((card) => card.type === type)
    if (!typedCards.length) continue

    const perCardRate = Number((typeRateBudget[type] / typedCards.length).toFixed(4))
    for (const card of typedCards) {
      card.dropRate = perCardRate
    }
  }

  for (const prestigeCard of cards.filter((card) => card.type === CardType.PRESTIGE)) {
    prestigeCard.dropRate = 0
  }
}

type CardLike = {
  cardId: string
  type: CardType | string
  imageUrl?: string
  member?: string
  year?: number
  period?: string
  name?: string
}

const normalizeMemberCode = (value?: string) => {
  if (!value) return undefined
  const compact = value.replace(/\s+/g, '')
  if (MEMBER_NAME_TO_CODE[compact]) return MEMBER_NAME_TO_CODE[compact]

  const upper = compact.toUpperCase()
  if (MEMBER_CODE_TO_NAME[upper]) return upper
  if (upper.includes('HAN') || compact.includes('한울')) return 'HAN'
  if (upper.includes('JAE') || compact.includes('재원')) return 'JAE'
  if (upper.includes('JIN') || compact.includes('진규')) return 'JIN'
  if (upper.includes('LEE') || compact.includes('승찬')) return 'LEE'
  if (upper.includes('MIN') || compact.includes('민석')) return 'MIN'
  return undefined
}

const inferYear = (card: CardLike) => {
  if (card.year && card.year > 1900) return card.year

  const source = `${card.cardId} ${card.name || ''} ${card.imageUrl || ''}`
  const fullYearMatch = source.match(/(19|20)\d{2}/)
  if (fullYearMatch) return Number(fullYearMatch[0])

  const shortYearMatch = source.match(/_(\d{2})_V[12]/i)
  if (shortYearMatch) {
    return toFullYear(Number(shortYearMatch[1]))
  }

  return undefined
}

const inferVersion = (card: CardLike) => {
  if (card.period === 'h1') return 1
  if (card.period === 'h2') return 2

  const source = `${card.cardId} ${card.name || ''} ${card.imageUrl || ''}`.toLowerCase()
  if (/(?:^|[_\s-])v1(?:$|[_\s.-])/.test(source) || source.includes('버전1')) return 1
  if (/(?:^|[_\s-])v2(?:$|[_\s.-])/.test(source) || source.includes('버전2')) return 2
  return undefined
}

const getImageBaseName = (imageUrl?: string) => {
  if (!imageUrl) return undefined
  const clean = imageUrl.split('?')[0]
  const baseName = path.basename(clean, path.extname(clean))
  return baseName ? baseName.toUpperCase() : undefined
}

const buildCardCanonicalKey = (card: CardLike) => {
  const type = String(card.type)
  const memberCode =
    normalizeMemberCode(card.member) ||
    normalizeMemberCode(card.cardId) ||
    normalizeMemberCode(card.name)
  const year = inferYear(card)
  const version = inferVersion(card)
  const imageBase = getImageBaseName(card.imageUrl)

  if (type === CardType.YEAR) {
    return `year:${memberCode || 'unknown'}:${year || 'unknown'}:${version || 'unknown'}`
  }

  if (type === CardType.SIGNATURE) {
    return `signature:${memberCode || 'unknown'}:${year || 'unknown'}`
  }

  if (type === CardType.SPECIAL) {
    return `special:${imageBase || toSlug(card.cardId)}`
  }

  if (type === CardType.MATERIAL) {
    return `material:${imageBase || toSlug(card.cardId)}`
  }

  if (type === CardType.PRESTIGE) {
    const prestigeKey =
      memberCode ||
      (card.cardId.includes('group') || card.cardId.includes('랑구') ? 'GROUP' : undefined) ||
      imageBase ||
      card.cardId
    return `prestige:${prestigeKey}`
  }

  return `${type}:${toSlug(card.cardId)}`
}

const mergeAliasInventory = async (aliasCardId: string, canonicalCardId: string) => {
  if (aliasCardId === canonicalCardId) return

  const aliasUserCards = await UserCard.find({ cardId: aliasCardId }).lean()
  for (const alias of aliasUserCards) {
    const target = await UserCard.findOneAndUpdate(
      { userId: alias.userId, cardId: canonicalCardId },
      {
        $inc: { quantity: alias.quantity },
        $setOnInsert: {
          acquiredBy: alias.acquiredBy,
          acquiredAt: alias.acquiredAt,
          isFavorite: alias.isFavorite,
          isLocked: alias.isLocked
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    if (target) {
      target.isFavorite = target.isFavorite || Boolean(alias.isFavorite)
      target.isLocked = target.isLocked || Boolean(alias.isLocked)
      if (new Date(alias.acquiredAt).getTime() > new Date(target.acquiredAt).getTime()) {
        target.acquiredAt = alias.acquiredAt
      }
      await target.save()
    }
  }

  await UserCard.deleteMany({ cardId: aliasCardId })
  await CardDrop.updateMany({ cardId: aliasCardId }, { $set: { cardId: canonicalCardId } })
}

export class CardCatalogService {
  static buildCardsFromLocalImages(): GeneratedCard[] {
    const cards = [
      ...parseYearCards(),
      ...parseSpecialCards(),
      ...parseSignatureCards(),
      ...parseMaterialCards(),
      ...parsePrestigeCards()
    ]

    applyDropRates(cards)

    return cards.sort((a, b) => a.cardId.localeCompare(b.cardId))
  }

  static async syncCardsFromLocalImages(): Promise<SyncResult> {
    const generatedCards = this.buildCardsFromLocalImages()
    let upsertedCount = 0

    for (const card of generatedCards) {
      await Card.findOneAndUpdate(
        { cardId: card.cardId },
        { $set: card },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )
      upsertedCount += 1
    }

    const canonicalByKey = new Map<string, GeneratedCard>()
    for (const generated of generatedCards) {
      canonicalByKey.set(buildCardCanonicalKey(generated), generated)
    }

    const existingCards = await Card.find().lean()
    for (const existing of existingCards) {
      const canonical = canonicalByKey.get(
        buildCardCanonicalKey(existing as unknown as CardLike)
      )
      if (!canonical) continue
      if (existing.cardId === canonical.cardId) continue

      await mergeAliasInventory(existing.cardId, canonical.cardId)
      await Card.deleteOne({ _id: (existing as any)._id })
    }

    return {
      generatedCount: generatedCards.length,
      upsertedCount,
      generatedCards
    }
  }
}
