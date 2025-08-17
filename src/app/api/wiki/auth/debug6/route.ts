import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('Debug6 jwt만 테스트...')
    
    // jwt 테스트
    const JWT_SECRET = process.env.JWT_SECRET || 'rangu-wiki-secret'
    const token = jwt.sign({ test: 'data' }, JWT_SECRET, { expiresIn: '7d' })
    const decoded = jwt.verify(token, JWT_SECRET)
    
    const body = await request.json()
    
    return NextResponse.json({
      success: true,
      message: 'Debug6 POST working with jwt only',
      jwtTest: !!decoded,
      receivedData: body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Debug6 POST error:', error)
    return NextResponse.json({
      success: false,
      error: 'Debug6 POST error: ' + (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
