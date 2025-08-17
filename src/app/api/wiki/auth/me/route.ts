import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import dbConnect from '@/lib/mongodb'
import { WikiUser } from '@/models/Wiki'
export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.JWT_SECRET || 'rangu-wiki-secret'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    // 쿠키에서 토큰 가져오기
    const token = request.cookies.get('wiki-token')?.value
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }
    
    try {
      // JWT 토큰 검증
      const decoded = jwt.verify(token, JWT_SECRET) as any
      
      // 사용자 정보 조회
      const wikiUser = await WikiUser.findById(decoded.userId).select('-password')
      
      if (!wikiUser) {
        return NextResponse.json(
          { success: false, error: '사용자를 찾을 수 없습니다.' },
          { status: 404 }
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
        return NextResponse.json(
          { success: false, error: '차단된 계정입니다.' },
          { status: 403 }
        )
      }
      
      // 마지막 활동 시간 업데이트
      wikiUser.lastActivity = new Date()
      await wikiUser.save()
      
      // 사용자 정보 반환
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
        lastLogin: wikiUser.lastLogin,
        mainUserId: wikiUser.mainUserId
      }
      
      return NextResponse.json({
        success: true,
        user: userInfo
      })
      
    } catch (jwtError) {
      console.error('JWT 검증 오류:', jwtError)
      return NextResponse.json(
        { success: false, error: '유효하지 않은 토큰입니다.' },
        { status: 401 }
      )
    }
    
  } catch (error) {
    console.error('위키 사용자 정보 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '사용자 정보 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
} 