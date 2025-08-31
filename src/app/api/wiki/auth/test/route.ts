import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Wiki Auth API is working',
    timestamp: new Date().toISOString()
  })
}

export async function POST() {
  return NextResponse.json({
    success: true,
    message: 'Wiki Auth API POST test successful',
    timestamp: new Date().toISOString()
  })
}
