import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Debug GET working',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  try {
    // 간단한 JSON 파싱 테스트
    const body = await request.json()
    
    return NextResponse.json({
      success: true,
      message: 'Debug POST working',
      receivedData: body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Debug POST error: ' + (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 400 })
  }
}
