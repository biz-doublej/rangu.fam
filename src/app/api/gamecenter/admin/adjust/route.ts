import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/adminAuth'
import { adjustPoints } from '@/lib/gamecenter/admin'
import { gamecenterErrorResponse } from '@/lib/gamecenter/auth'

export const dynamic = 'force-dynamic'

/**
 * POST /api/gamecenter/admin/adjust { username, delta, note, requestId }
 * 관리자 포인트 수동 조정 (사유 필수, 원장 reason 'admin.adjust').
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await checkAdminAuth(request)
    if (!admin) {
      return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }
    const body = await request.json().catch(() => null)
    const result = await adjustPoints({
      username: String(body?.username ?? ''),
      delta: Number(body?.delta),
      note: String(body?.note ?? ''),
      requestId: body?.requestId,
      adminUsername: admin.username,
    })
    return NextResponse.json({ success: true, status: result.status, amount: result.amount, balance: result.balance })
  } catch (error) {
    return gamecenterErrorResponse(error, '포인트 수동 조정')
  }
}
