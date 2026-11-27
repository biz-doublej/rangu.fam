import { NextRequest, NextResponse } from 'next/server'
import { gamecenterErrorResponse, requireGamecenterUser } from '@/lib/gamecenter/auth'
import { purchase } from '@/lib/gamecenter/shop'

export const dynamic = 'force-dynamic'

/**
 * POST /api/gamecenter/shop/purchase { itemId, requestId }
 * 가격은 서버의 gc_shop_items 에서만 읽는다. requestId 는 같은 요청의 중복 처리를 막는 키.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await requireGamecenterUser(request)
    if (!auth.ok) return auth.response

    const body = await request.json().catch(() => null)
    const itemId = typeof body?.itemId === 'string' ? body.itemId : ''
    if (!itemId) {
      return NextResponse.json({ success: false, error: '상품을 골라 주세요.' }, { status: 400 })
    }

    const result = await purchase({ userId: auth.user.id, itemId, requestId: body?.requestId })
    return NextResponse.json({
      success: true,
      status: result.status,
      balance: result.balance,
      order: result.order && { id: result.order.id, status: result.order.status, price: result.order.price },
      granted: result.granted,
    })
  } catch (error) {
    return gamecenterErrorResponse(error, '상품 교환')
  }
}
