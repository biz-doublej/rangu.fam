/**
 * 인형뽑기 인형 6종: 랑구팸 5명 캐릭터 + 황금 랑구.
 *
 * TODO(정재원): 멤버별 동물·이름·색은 임시값이다 (데모의 곰·토끼·고양이·개구리·펭귄을 순서대로 붙였음).
 *   정해지면 아래 animal / name / color / dark 만 바꾸면 된다.
 *   key 는 보유품 키('plush:<key>')로 저장되므로 한 번 배포한 뒤에는 바꾸지 않는다.
 */

/** 그릴 수 있는 인형 모양 (src/games/claw/drawPlush.ts) */
export type PlushAnimal = 'bear' | 'rabbit' | 'cat' | 'frog' | 'penguin'

export interface PlushType {
  key: string
  name: string
  animal: PlushAnimal
  /** 몸 색 */
  color: string
  /** 테두리 색 */
  dark: string
  rare?: boolean
}

export const GOLD_PLUSH_KEY = 'gold'

export const PLUSHES: PlushType[] = [
  { key: 'hanul', name: '한울 랑구', animal: 'bear', color: '#c98b5b', dark: '#8a5631' },
  { key: 'jaewon', name: '재원 랑구', animal: 'rabbit', color: '#f7c3d8', dark: '#c7799b' },
  { key: 'minseok', name: '민석 랑구', animal: 'cat', color: '#ffb347', dark: '#c97a12' },
  { key: 'seungchan', name: '승찬 랑구', animal: 'frog', color: '#8fd16a', dark: '#4f9130' },
  { key: 'jinkyu', name: '진규 랑구', animal: 'penguin', color: '#3d4b73', dark: '#232c47' },
  { key: GOLD_PLUSH_KEY, name: '황금 랑구', animal: 'bear', color: '#ffd23f', dark: '#c99400', rare: true },
]

/** 황금이 아닌 인형 */
export const COMMON_PLUSHES = PLUSHES.filter((plush) => !plush.rare)

export function findPlush(key: string): PlushType | undefined {
  return PLUSHES.find((plush) => plush.key === key)
}

/** 보유품(gc_inventory) 키 */
export function plushItemKey(key: string): string {
  return `plush:${key}`
}
