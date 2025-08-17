import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Debug2 GET working',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  try {
    // MongoDB 연결 테스트
    console.log('MongoDB 연결 시도...')
    await dbConnect()
    console.log('MongoDB 연결 성공!')
    
    // JSON 파싱 테스트
    const body = await request.json()
    
    return NextResponse.json({
      success: true,
      message: 'Debug2 POST working with MongoDB',
      receivedData: body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Debug2 POST error:', error)
    return NextResponse.json({
      success: false,
      error: 'Debug2 POST error: ' + (error as Error).message,
      stack: (error as Error).stack,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
