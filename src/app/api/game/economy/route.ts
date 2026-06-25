import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedWikiUser } from '@/lib/doublejAuth'
import { getDb } from '@/db/client'
import { loadEconomySnapshot } from '@/lib/tactics/economyService'

export const dynamic = 'force-dynamic'

/**
 * 택틱스 경제 1회 하이드레이션 — 지갑 + 상점(카탈로그+보유) + 퀘스트(현재기간) + 패스. [경제 E1]
 * 쿠키 인증(doublej-token). 미인증 시 401.
 */
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedWikiUser(request)
  if (!user) {
    return NextResponse.json({ success: false, error: 'not_authenticated' }, { status: 401 })
  }
  try {
    const db = getDb()
    const snapshot = await loadEconomySnapshot(db, (user as { id: string }).id, new Date())
    return NextResponse.json({ success: true, ...snapshot })
  } catch (e) {
    console.error('economy 조회 오류:', e)
    return NextResponse.json({ success: false, error: 'server_error' }, { status: 500 })
  }
}
