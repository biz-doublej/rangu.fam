import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('Debug7 bcryptjs 테스트...')
    
    // bcryptjs 테스트
    const testPassword = 'testpassword123'
    const hashedPassword = await bcrypt.hash(testPassword, 12)
    const isValid = await bcrypt.compare(testPassword, hashedPassword)
    
    const body = await request.json()
    
    return NextResponse.json({
      success: true,
      message: 'Debug7 POST working with bcryptjs',
      bcryptjsTest: isValid,
      receivedData: body,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Debug7 POST error:', error)
    return NextResponse.json({
      success: false,
      error: 'Debug7 POST error: ' + (error as Error).message,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
}
