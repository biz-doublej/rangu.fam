import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * (중단됨) 네이티브 셸용 웹뷰 세션 브릿지.
 *
 * DoubleJ SSO 시절 셸이 받은 access_token 을 userinfo 로 확인해 세션 쿠키를 발급했다.
 * 구글 로그인으로 바뀐 뒤엔 같은 방식이 안전하지 않다 — 구글 userinfo 는 "우리 앱이 아닌
 * 다른 앱"에 발급된 access_token 도 받아주므로, 아무 구글 토큰으로 이 사이트 세션을 만들 수 있게 된다.
 * 네이티브 셸(런처)도 이미 폐기되었으므로 엔드포인트를 닫는다.
 */
export async function POST() {
  return NextResponse.json({ success: false, error: 'endpoint_removed' }, { status: 410 })
}
