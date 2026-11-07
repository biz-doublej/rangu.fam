import { NextRequest, NextResponse } from 'next/server'
import { getAuditLogs } from '@/app/api/wiki/_utils/audit'
import { getStaffUser } from '@/lib/staffAuth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const staff = await getStaffUser(request)
  if (!staff?.isModerator) {
    return NextResponse.json({ success: false, error: '권한 없음' }, { status: 403 })
  }
  return NextResponse.json({ success: true, logs: getAuditLogs() })
}
