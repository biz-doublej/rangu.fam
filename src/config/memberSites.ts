/**
 * 멤버 개인 페이지 메타데이터.
 * 카드 클릭 → 외부 서브도메인 이동에 사용. 또한 각 멤버 페이지에서 자기 메타 조회 가능.
 *
 * 로컬 dev에서는 서브도메인 전환이 어렵기 때문에 `path`로 fallback (/m/{slug})를 두고,
 * 프로덕션에서는 `host`를 사용한다.
 */

export type MemberSlug = 'jaewon' | 'minseok' | 'jingyu' | 'hanul' | 'seungchan'

export interface MemberSite {
  slug: MemberSlug
  name: string
  /** subdomain host on production */
  host: string | null
  /** internal path used both for local dev and for middleware rewrite target */
  path: string
  /** short concept tag */
  topic: string
}

export const MEMBER_SITES: Record<MemberSlug, MemberSite> = {
  seungchan: {
    slug: 'seungchan',
    name: '이승찬',
    host: 'seungchan.rangu-fam.com',
    path: '/m/seungchan',
    topic: '마술',
  },
  minseok: {
    slug: 'minseok',
    name: '정민석',
    host: 'minseok.rangu-fam.com',
    path: '/m/minseok',
    topic: '음악',
  },
  hanul: {
    slug: 'hanul',
    name: '강한울',
    host: 'hanul.rangu-fam.com',
    path: '/m/hanul',
    topic: '철도',
  },
  jingyu: {
    slug: 'jingyu',
    name: '정진규',
    host: 'jingyu.rangu-fam.com',
    path: '/m/jingyu',
    topic: '군인',
  },
  jaewon: {
    slug: 'jaewon',
    name: '정재원',
    host: null, // 페이지 미정 — 카드 클릭 시 fallback 처리
    path: '/m/jaewon',
    topic: '소프트웨어',
  },
}

/**
 * 멤버 카드 클릭 시 이동할 URL.
 * 프로덕션: `https://{host}` (자기 서브도메인)
 * 로컬:   `${path}` (메인 도메인 내부 경로)
 *
 * 페이지가 아직 안 만들어진 멤버는 null 반환 → 호출자가 disabled 처리.
 */
export function memberSiteUrl(slug: MemberSlug, opts: { isProd?: boolean } = {}): string | null {
  const m = MEMBER_SITES[slug]
  if (!m) return null
  const isProd = opts.isProd ?? (typeof window !== 'undefined' && window.location.hostname.endsWith('rangu-fam.com'))
  if (isProd && m.host) return `https://${m.host}`
  return m.path
}
