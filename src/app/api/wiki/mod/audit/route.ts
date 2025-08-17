import { NextRequest, NextResponse } from 'next/server'
import { getAuditLogs } from '@/app/api/wiki/_utils/audit'


export const dynamic = 'force-dynamic'
export async function GET() {
  return NextResponse.json({ success: true, logs: getAuditLogs() })
}


