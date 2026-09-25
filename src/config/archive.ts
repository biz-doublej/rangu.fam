/**
 * 랑구팸 아카이브 모드 설정.
 *
 * 랑구팸(rangu-fam.com)은 운영을 멈추고 정적 보관소로 전환한다(2026-09-25 기획).
 * - 메인(`/`)은 단일 정적 페이지(대표 사진 + D-day + 소개)로 대체
 * - 카드/피드/선물상자 등 쓰기 기능은 middleware 에서 차단(페이지 → `/`, API → 410)
 *
 * 코드/테이블은 아직 삭제하지 않았으므로 `NEXT_PUBLIC_RANGU_ARCHIVE=off` 로 빌드하면 원복된다.
 * (NEXT_PUBLIC_* 는 빌드 타임에 인라인되어 middleware(edge)·클라이언트 양쪽에서 동일하게 읽힌다.)
 */
export const RANGU_ARCHIVE_MODE = process.env.NEXT_PUBLIC_RANGU_ARCHIVE !== 'off'

/** 아카이브 모드에서 `/` 로 돌려보낼 랑구팸 기능 페이지 */
export const ARCHIVED_PAGE_PREFIXES = ['/cards', '/feed', '/members', '/about']

/** 아카이브 모드에서 410 Gone 으로 막을 쓰기 위주 API */
export const ARCHIVED_API_PREFIXES = ['/api/cards', '/api/gift', '/api/feed', '/api/spotlight']

export function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export type ArchiveAnniversary = {
  label: string
  /** YYYY-MM-DD (KST 기준 시작일) */
  date: string
}

/**
 * 메인에 표시할 기념일 기준일. 경과 N주년·N일째와 다음 기념일(N주년 / 100일 단위)까지의 D-day 를 보여준다.
 * 첫 항목이 크게, 나머지는 보조로 표시된다.
 */
export const ARCHIVE_ANNIVERSARIES: ArchiveAnniversary[] = [
  { label: 'Rangu.fam 사이트 오픈', date: '2025-07-27' },
]

export const ARCHIVE_MEMBERS = [
  { name: '정재원', role: '개발 · 패션' },
  { name: '정민석', role: '루체른 IMI' },
  { name: '정진규', role: '복무 중' },
  { name: '강한울', role: '철도차량시스템' },
  { name: '이승찬', role: '마술사' },
] as const
