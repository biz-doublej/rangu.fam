import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { WikiUser } from '@/models/Wiki'

export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Debug3 GET working',
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  try {
    // MongoDB 연결
    console.log('MongoDB 연결 시도...')
    await dbConnect()
    console.log('MongoDB 연결 성공!')
    
    // WikiUser 모델 테스트
    console.log('WikiUser 모델 테스트...')
    const userCount = await WikiUser.countDocuments()
    console.log('WikiUser 개수:', userCount)
    
    const body = await request.json()
    
    return NextResponse.json({
      success: true,
      message: 'Debug3 POST working with WikiUser model',
      userCount,
      receivedData: body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Debug3 POST error:', error)
    return NextResponse.json({
      success: false,
      error: 'Debug3 POST error: ' + (error as Error).message,
      stack: (error as Error).stack?.split('\n').slice(0, 5), // 처음 5줄만
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
