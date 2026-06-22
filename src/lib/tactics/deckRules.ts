/**
 * 택틱스 덱 규칙 상수/타입 — 클라이언트·서버 공용(순수, DB 의존 없음).
 * 서버 검증 로직은 deckService.ts(이 파일을 import). 클라 스토어/페이지도 이 파일만 import.
 */
export const DECK_SIZE = 16
export const MAX_COPIES = 3
export const MAX_CHAMPION_COPIES = 1

export interface DeckCard {
  cardId: string
  count: number
}
