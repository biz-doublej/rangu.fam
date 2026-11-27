import { NextRequest, NextResponse } from 'next/server'
import { gamecenterErrorResponse, requireGamecenterUser } from '@/lib/gamecenter/auth'
import { finishRun } from '@/lib/gamecenter/runs'

export const dynamic = 'force-dynamic'

/**
 * POST /api/gamecenter/runs/[id]/finish { inputs, clientScore }
 * 서버가 입력 기록을 같은 엔진으로 다시 실행해 점수를 확정한다.
 * clientScore 는 비교용이고(다르면 rejected), 보상 금액은 서버가 정한다.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await requireGamecenterUser(request)
    if (!auth.ok) return auth.response
    const body = await request.json().catch(() => null)
    const result = await finishRun({
      userId: auth.user.id,
      runId: params.id,
      inputs: body?.inputs,
      clientScore: body?.clientScore,
    })
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    return gamecenterErrorResponse(error, '판 검증')
  }
}
