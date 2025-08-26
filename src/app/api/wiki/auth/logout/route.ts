import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import dbConnect from '@/lib/mongodb'
import { WikiUser } from '@/models/Wiki'
import { DiscordWebhookService } from '@/services/discordWebhookService'

const JWT_SECRET = process.env.JWT_SECRET || 'rangu-wiki-secret'


export const dynamic = 'force-dynamic'
export async function POST(request: NextRequest) {
  try {
    let username = null
    
    // Get username before clearing token for Discord notification
    try {
      await dbConnect()
      const token = request.cookies.get('wiki-token')?.value
      
      if (token) {
        const decoded = jwt.verify(token, JWT_SECRET) as any
        const wikiUser = await WikiUser.findById(decoded.userId).select('username')
        username = wikiUser?.username
      }
    } catch (error) {
      // If we can't get the username, continue with logout anyway
      console.warn('Could not get username for logout notification:', error)
    }
    
    const response = NextResponse.json({
      success: true,
      message: '로그아웃 되었습니다.'
    })
    
    // 위키 토큰 쿠키 제거
    response.cookies.set('wiki-token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0 // 즉시 만료
    })
    
    // Send Discord webhook notification for user logout
    if (username) {
      try {
        // 로그아웃은 별도 알림 없이 처리 (스팸 방지)
        console.log(`📤 ${username} 사용자 로그아웃`)
      } catch (webhookError) {
        console.error('Discord webhook 전송 실패:', webhookError)
        // Webhook 실패는 로그아웃을 방해하지 않음
      }
    }
    
    return response
    
  } catch (error) {
    console.error('위키 로그아웃 오류:', error)
    return NextResponse.json(
      { success: false, error: '로그아웃 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 