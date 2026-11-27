import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminAuth'
import { gamecenterErrorResponse } from '@/lib/gamecenter/auth'
import { listOrders, resolveOrder } from '@/lib/gamecenter/shop'

export const dynamic = 'force-dynamic'

const FORBIDDEN = () => NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
const STATUSES = ['pending', 'fulfilled', 'used', 'cancelled'] as const

/** GET /api/gamecenter/admin/orders?status=pending — 주문 목록 (기본: 처리 대기) */
export async function GET(request: NextRequest) {
  try {
    if (!(await checkAdminAuth(request))) return FORBIDDEN()
    const requested = new URL(request.url).searchParams.get('status') || 'pending'
    const status = STATUSES.find((value) => value === requested)
    return NextResponse.json({ success: true, orders: await listOrders(undefined, { status }) })
  } catch (error) {
    return gamecenterErrorResponse(error, '주문 조회')
  }
}

/** POST { orderId, action: 'used' | 'cancelled' } — 대기 주문 처리. 취소하면 포인트를 돌려준다. */
export async function POST(request: NextRequest) {
  try {
    const admin = await checkAdminAuth(request)
    if (!admin) return FORBIDDEN()
    const body = await request.json().catch(() => null)
    if (typeof body?.orderId !== 'string' || (body?.action !== 'used' && body?.action !== 'cancelled')) {
      return NextResponse.json({ success: false, error: '요청이 올바르지 않습니다.' }, { status: 400 })
    }
    const order = await resolveOrder({ orderId: body.orderId, action: body.action, adminId: admin.userId })
    return NextResponse.json({ success: true, order })
  } catch (error) {
    return gamecenterErrorResponse(error, '주문 처리')
  }
}
