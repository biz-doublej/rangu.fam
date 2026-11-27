import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminAuth'
import { gamecenterErrorResponse } from '@/lib/gamecenter/auth'
import { listShopItems, parseShopItemInput, setShopItemActive, upsertShopItem } from '@/lib/gamecenter/shop'

export const dynamic = 'force-dynamic'

const FORBIDDEN = () => NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })

/** GET /api/gamecenter/admin/items — 판매 중지 상품까지 전부 */
export async function GET(request: NextRequest) {
  try {
    if (!(await checkAdminAuth(request))) return FORBIDDEN()
    return NextResponse.json({ success: true, items: await listShopItems(undefined, { includeInactive: true }) })
  } catch (error) {
    return gamecenterErrorResponse(error, '상품 관리 조회')
  }
}

/** POST — 상품 추가·수정 (id 가 같으면 덮어씀) */
export async function POST(request: NextRequest) {
  try {
    if (!(await checkAdminAuth(request))) return FORBIDDEN()
    const item = await upsertShopItem(parseShopItemInput(await request.json().catch(() => null)))
    return NextResponse.json({ success: true, item })
  } catch (error) {
    return gamecenterErrorResponse(error, '상품 저장')
  }
}

/** PATCH { id, active } — 판매 중지 / 재개 */
export async function PATCH(request: NextRequest) {
  try {
    if (!(await checkAdminAuth(request))) return FORBIDDEN()
    const body = await request.json().catch(() => null)
    if (typeof body?.id !== 'string' || typeof body?.active !== 'boolean') {
      return NextResponse.json({ success: false, error: '요청이 올바르지 않습니다.' }, { status: 400 })
    }
    return NextResponse.json({ success: true, item: await setShopItemActive(body.id, body.active) })
  } catch (error) {
    return gamecenterErrorResponse(error, '상품 판매 상태 변경')
  }
}
