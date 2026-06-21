import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * API 콘솔(/api/docx) 비밀번호 검증.
 *
 * 비밀번호가 맞으면 전체 엔드포인트 카탈로그를 반환한다. 카탈로그는 인증 성공 시에만
 * 응답에 실리므로 클라이언트 번들에는 포함되지 않는다. 비밀번호는 env(API_DOCS_PASSWORD)
 * 로 덮어쓸 수 있고, 없으면 기본값을 사용한다.
 */
const API_DOCS_PASSWORD = process.env.API_DOCS_PASSWORD || 'Wodnjs0136?'

interface Endpoint {
  method: string
  path: string
  desc: string
}
interface Group {
  category: string
  emoji: string
  endpoints: Endpoint[]
}

const CATALOG: Group[] = [
  {
    category: '카드',
    emoji: '🃏',
    endpoints: [
      { method: 'GET·POST', path: '/api/cards', desc: '카드 카탈로그 조회 / 생성(관리자)' },
      { method: 'GET', path: '/api/cards/recent-activity', desc: '최근 멤버 카드 활동' },
      { method: 'GET·PATCH', path: '/api/cards/inventory', desc: '인벤토리 조회 / 즐겨찾기·잠금' },
      { method: 'GET·POST', path: '/api/cards/drop', desc: '남은 드랍 횟수 / 일일 드랍' },
      { method: 'POST', path: '/api/cards/craft', desc: '프레스티지 제작 (성공률 70%)' },
      { method: 'GET', path: '/api/cards/stats', desc: '사용자 카드 통계' },
      { method: 'GET·POST', path: '/api/cards/dogam', desc: '도감 진행도 / 동기화·만렙 보상' },
      { method: 'GET·POST', path: '/api/cards/trades', desc: '카드 교환 목록 / 제안' },
      { method: 'GET·PATCH', path: '/api/cards/trades/[id]', desc: '교환 상세 / 수락·거절·취소' },
      { method: 'POST', path: '/api/cards/seed', desc: '카드 수 확인(시드 상태)' },
    ],
  },
  {
    category: '위키',
    emoji: '📚',
    endpoints: [
      { method: 'GET·POST', path: '/api/wiki/pages', desc: '문서 조회 / 작성·수정' },
      { method: 'GET', path: '/api/wiki/pages/revisions', desc: '문서 리비전 이력' },
      { method: 'POST', path: '/api/wiki/pages/revert', desc: '리비전 되돌리기' },
      { method: 'POST', path: '/api/wiki/pages/move', desc: '문서 이동/이름변경' },
      { method: 'POST', path: '/api/wiki/pages/protect', desc: '문서 보호 설정' },
      { method: 'POST', path: '/api/wiki/pages/lock', desc: '문서 편집 잠금' },
      { method: 'GET', path: '/api/wiki/pages/captcha', desc: '문서 작성 캡차' },
      { method: 'GET', path: '/api/wiki/search', desc: '문서 검색' },
      { method: 'GET', path: '/api/wiki/recent', desc: '최근 변경' },
      { method: 'GET', path: '/api/wiki/random', desc: '랜덤 문서' },
      { method: 'GET', path: '/api/wiki/exists', desc: '문서 존재 여부' },
      { method: 'GET', path: '/api/wiki/latest-edit', desc: '최근 편집 정보' },
      { method: 'GET', path: '/api/wiki/categories', desc: '분류 목록' },
      { method: 'GET', path: '/api/wiki/dashboard', desc: '위키 대시보드' },
      { method: 'GET', path: '/api/wiki/feed', desc: '위키 활동 피드' },
      { method: 'GET', path: '/api/wiki/trending', desc: '인기 문서' },
      { method: 'GET', path: '/api/wiki/stats', desc: '통계 / 연보' },
      { method: 'GET', path: '/api/wiki/graph', desc: '문서 링크 그래프' },
      { method: 'GET', path: '/api/wiki/contributors', desc: '기여자 목록' },
      { method: 'GET', path: '/api/wiki/contributions', desc: '기여 내역' },
      { method: 'GET·POST', path: '/api/wiki/poll', desc: '문서 투표 / 투표하기' },
      { method: 'GET·POST', path: '/api/wiki/discussions', desc: '토론' },
      { method: 'GET·POST', path: '/api/wiki/watchlist', desc: '워치리스트' },
      { method: 'POST', path: '/api/wiki/spell-check', desc: '맞춤법 검사' },
      { method: 'GET', path: '/api/wiki/workshop', desc: '워크샵' },
      { method: 'POST', path: '/api/wiki/files/upload', desc: '위키 파일 업로드' },
      { method: 'GET', path: '/api/wiki/users', desc: '위키 사용자' },
    ],
  },
  {
    category: '위키 모더레이션',
    emoji: '🛡️',
    endpoints: [
      { method: 'GET·POST', path: '/api/wiki/mod', desc: '모더레이션 액션' },
      { method: 'GET', path: '/api/wiki/mod/audit', desc: '감사 로그' },
      { method: 'GET', path: '/api/wiki/mod/users', desc: '사용자 관리' },
      { method: 'POST', path: '/api/wiki/mod/ban', desc: '사용자 차단' },
      { method: 'GET', path: '/api/wiki/mod/reports', desc: '신고 목록' },
    ],
  },
  {
    category: '인증 · 계정',
    emoji: '🔐',
    endpoints: [
      { method: 'GET', path: '/api/auth/me', desc: '현재 사용자' },
      { method: 'POST', path: '/api/auth/logout', desc: '로그아웃' },
      { method: 'GET', path: '/api/auth/discord/start', desc: '디스코드 OAuth 시작' },
      { method: 'GET', path: '/api/auth/discord/callback', desc: 'OAuth 콜백' },
      { method: 'GET', path: '/api/auth/discord/link/start', desc: '디스코드 연동 시작' },
      { method: 'GET', path: '/api/auth/discord/link/callback', desc: '연동 콜백' },
      { method: 'POST', path: '/api/auth/discord/unlink', desc: '디스코드 연동 해제' },
      { method: 'GET', path: '/api/account/session', desc: '세션 정보' },
      { method: 'POST', path: '/api/account/link-member', desc: '멤버 계정 연동' },
      { method: 'GET', path: '/api/wiki/auth/me', desc: '현재 위키 사용자' },
      { method: 'POST', path: '/api/wiki/auth/logout', desc: '위키 로그아웃' },
      { method: 'POST', path: '/api/wiki/auth/link', desc: '위키 계정 연동' },
      { method: 'POST', path: '/api/wiki/auth/discord-login', desc: '위키 디스코드 로그인' },
    ],
  },
  {
    category: '프로필 · 멤버',
    emoji: '👥',
    endpoints: [
      { method: 'GET', path: '/api/members', desc: '멤버 목록' },
      { method: 'GET', path: '/api/spotlight', desc: '스포트라이트' },
      { method: 'GET·POST', path: '/api/profiles', desc: '프로필 목록 / 생성' },
      { method: 'GET·PATCH', path: '/api/profiles/[id]', desc: '프로필 상세 / 수정' },
      { method: 'POST', path: '/api/profiles/[id]/follow', desc: '팔로우/언팔로우' },
      { method: 'GET', path: '/api/profiles/[id]/followers', desc: '팔로워' },
      { method: 'GET', path: '/api/profiles/[id]/following', desc: '팔로잉' },
    ],
  },
  {
    category: '콘텐츠 · 미디어',
    emoji: '🖼️',
    endpoints: [
      { method: 'GET·POST', path: '/api/bookmarks', desc: '북마크 목록 / 추가' },
      { method: 'PATCH·DELETE', path: '/api/bookmarks/[id]', desc: '북마크 수정/삭제' },
      { method: 'POST', path: '/api/bookmarks/reorder', desc: '북마크 정렬' },
      { method: 'GET', path: '/api/site-history', desc: '사이트 변경 이력' },
      { method: 'GET', path: '/api/feed', desc: '통합 피드' },
      { method: 'GET·POST', path: '/api/images', desc: '이미지 조회 / 등록' },
      { method: 'POST', path: '/api/images/upload', desc: '이미지 업로드' },
      { method: 'GET', path: '/api/images/serve/[filename]', desc: '이미지 서빙' },
    ],
  },
  {
    category: '관리자',
    emoji: '⚙️',
    endpoints: [
      { method: 'POST', path: '/api/admin/auth', desc: '관리자 인증' },
      { method: 'POST', path: '/api/admin/wiki-auth', desc: '위키 관리자 인증' },
      { method: 'GET', path: '/api/admin/pages', desc: '페이지 관리' },
      { method: 'GET', path: '/api/admin/dashboard-stats', desc: '관리 대시보드 통계' },
      { method: 'POST', path: '/api/admin/add-user', desc: '사용자 추가' },
      { method: 'POST', path: '/api/admin/reset-rankings', desc: '랭킹 초기화' },
      { method: 'POST', path: '/api/admin/reset-submissions', desc: '제출 초기화' },
    ],
  },
  {
    category: '관리자 · 유지보수 (?confirm=1)',
    emoji: '🧰',
    endpoints: [
      { method: 'GET', path: '/api/admin/maintenance/prestige-cards', desc: '⭐ 프레스티지 카드 시드/복구' },
      { method: 'GET', path: '/api/admin/maintenance/cards-2026', desc: '2026 카드 시드' },
      { method: 'GET', path: '/api/admin/maintenance/cards-trades', desc: '카드 교환 기능 활성화' },
      { method: 'GET', path: '/api/admin/maintenance/cards-fk', desc: '카드 소유 FK 재지정' },
      { method: 'GET', path: '/api/admin/maintenance/wiki-stats', desc: '위키 통계 활성화' },
      { method: 'GET', path: '/api/admin/maintenance/wiki-features', desc: '위키 기능 토글' },
      { method: 'GET', path: '/api/admin/maintenance/recompute-links', desc: '문서 링크 재계산' },
      { method: 'GET', path: '/api/admin/maintenance/help-2026', desc: '도움말 시드' },
    ],
  },
]

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const password = typeof body?.password === 'string' ? body.password : ''

    if (password !== API_DOCS_PASSWORD) {
      return NextResponse.json(
        { success: false, message: '비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    const totalEndpoints = CATALOG.reduce((s, g) => s + g.endpoints.length, 0)
    return NextResponse.json({ success: true, catalog: CATALOG, totalEndpoints })
  } catch (error) {
    console.error('api docs auth error:', error)
    return NextResponse.json(
      { success: false, message: '요청 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
