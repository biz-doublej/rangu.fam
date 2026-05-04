import { createHash } from 'crypto'

/**
 * 카드 시스템 공용 헬퍼.
 *
 * 기존 CardService static 메서드 중 DB 무관 순수 함수만 추출.
 * cards/inventory, cards/stats 라우트가 사용.
 */

export const FALLBACK_CARD_IMAGE = '/images/default-music-cover.jpg'

export function ensureImage<T extends { imageUrl?: string | null }>(card: T): T {
  if (!card?.imageUrl || typeof card.imageUrl !== 'string' || !card.imageUrl.trim()) {
    return { ...card, imageUrl: FALLBACK_CARD_IMAGE }
  }
  return card
}

/**
 * 임의 사용자 식별자(Discord username 등) → UUID 형식.
 *
 * - 24자 ObjectId hex → 패딩하여 UUID
 * - UUID 형식이면 그대로
 * - 그 외 임의 문자열 → MD5 24자 → UUID 형식
 *
 * Postgres 마이그레이션에서 Mongo ObjectId를 동일 hex의 UUID로 보관했기 때문에,
 * 이 함수가 만든 UUID는 기존 Mongo 데이터의 row와 매칭됨.
 */
export function normalizeUserIdToUuid(rawId: string): string {
  // 이미 UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawId)) {
    return rawId.toLowerCase()
  }
  // 24자 ObjectId hex
  if (/^[0-9a-f]{24}$/i.test(rawId)) {
    const padded = rawId.padEnd(32, '0')
    return `${padded.slice(0, 8)}-${padded.slice(8, 12)}-${padded.slice(12, 16)}-${padded.slice(16, 20)}-${padded.slice(20, 32)}`.toLowerCase()
  }
  // 임의 문자열 → MD5
  const hex = createHash('md5').update(rawId || 'guest').digest('hex').slice(0, 24)
  const padded = hex.padEnd(32, '0')
  return `${padded.slice(0, 8)}-${padded.slice(8, 12)}-${padded.slice(12, 16)}-${padded.slice(16, 20)}-${padded.slice(20, 32)}`
}
