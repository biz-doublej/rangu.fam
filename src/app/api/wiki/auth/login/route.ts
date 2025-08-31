import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import dbConnect from '@/lib/mongodb'
import { WikiUser } from '@/models/Wiki'
import { getIpAddress, formatIpForDisplay } from '@/lib/getIpAddress'
import { DiscordWebhookService } from '@/services/discordWebhookService'
export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.JWT_SECRET || 'rangu-wiki-secret'

export async function POST(request: NextRequest) {
  try {
    try {
      await dbConnect()
    } catch (dbError) {
      console.error('데이터베이스 연결 오류:', dbError)
      return NextResponse.json(
        { success: false, error: '데이터베이스 연결에 실패했습니다.' },
        { status: 500 }
      )
    }
    
    let body;
    try {
      body = await request.json()
    } catch (parseError) {
      console.error('JSON 파싱 오류:', parseError)
      return NextResponse.json(
        { success: false, error: '잘못된 요청 형식입니다.' },
        { status: 400 }
      )
    }
    
    const { username, password } = body
    
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '아이디와 비밀번호를 입력해주세요.' },
        { status: 400 }
      )
    }
    
    // 위키 사용자 찾기
    const wikiUser = await WikiUser.findOne({ 
      $or: [
        { username: username },
        { email: username }
      ]
    })
    
    if (!wikiUser) {
      return NextResponse.json(
        { success: false, error: '존재하지 않는 사용자입니다.' },
        { status: 401 }
      )
    }
    
    // 계정 상태 확인
    if (!wikiUser.isActive) {
      return NextResponse.json(
        { success: false, error: '비활성화된 계정입니다.' },
        { status: 401 }
      )
    }
    
    if (wikiUser.isBanned) {
      const banMessage = wikiUser.banReason ? 
        `차단된 계정입니다. 사유: ${wikiUser.banReason}` : 
        '차단된 계정입니다.'
      
      return NextResponse.json(
        { success: false, error: banMessage },
        { status: 403 }
      )
    }
    
    // 비밀번호 확인
    const isValidPassword = await bcrypt.compare(password, wikiUser.password)
    
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: '비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }
    
    // JWT 토큰 생성
    const token = jwt.sign(
      { 
        userId: wikiUser._id,
        username: wikiUser.username,
        role: wikiUser.role,
        permissions: wikiUser.permissions
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )
    
    // 사용자 IP 주소 가져오기
    const ipAddress = getIpAddress(request)
    const formattedIp = formatIpForDisplay(ipAddress)
    
    // 마지막 로그인 시간 업데이트
    wikiUser.lastLogin = new Date()
    wikiUser.lastActivity = new Date()
    wikiUser.lastLoginIp = ipAddress
    await wikiUser.save()
    
    // Send Discord webhook notification for user login
    try {
      const userAgent = request.headers.get('user-agent')
      await DiscordWebhookService.sendUserLogin(
        wikiUser.username,
        ipAddress,
        userAgent || undefined
      )
    } catch (webhookError) {
      console.error('Discord webhook 전송 실패:', webhookError)
      // Webhook 실패는 로그인을 방해하지 않음
    }
    
    // 사용자 정보 (비밀번호 제외)
    const userInfo = {
      id: wikiUser._id,
      username: wikiUser.username,
      displayName: wikiUser.displayName || wikiUser.username,
      email: wikiUser.email,
      role: wikiUser.role,
      permissions: wikiUser.permissions,
      avatar: wikiUser.avatar,
      bio: wikiUser.bio,
      signature: wikiUser.signature,
      edits: wikiUser.edits,
      pagesCreated: wikiUser.pagesCreated,
      reputation: wikiUser.reputation,
      preferences: wikiUser.preferences,
      isActive: wikiUser.isActive,
      lastLogin: wikiUser.lastLogin
    }
    
    // 쿠키에 토큰 설정
    const response = NextResponse.json({
      success: true,
      message: '로그인 성공',
      user: userInfo,
      loginNotification: {
        type: 'login',
        title: '로그인 성공',
        message: `${wikiUser.displayName || wikiUser.username}님, 안전하게 로그인되었습니다.`,
        data: {
          ipAddress: formattedIp,
          timestamp: new Date().toISOString()
        }
      }
    })
    
    response.cookies.set('wiki-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7일
    })
    
    return response
    
  } catch (error) {
    console.error('위키 로그인 오류:', error)
    return NextResponse.json(
      { success: false, error: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 