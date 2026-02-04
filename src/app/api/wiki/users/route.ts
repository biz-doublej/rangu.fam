import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { WikiUser } from '@/models/Wiki'
import { DiscordWebhookService } from '@/services/discordWebhookService'
import jwt from 'jsonwebtoken'
import { enforceUserAccessPolicy } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

// JWT에서 사용자 정보 추출
async function getUserFromToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null
    const cookieToken = request.cookies.get('wiki-token')?.value || null
    const tokens = [bearerToken, cookieToken].filter(Boolean) as string[]
    if (tokens.length === 0) return null

    const JWT_SECRET = process.env.JWT_SECRET || 'rangu-wiki-secret'
    await dbConnect()

    for (const token of tokens) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as any
        let user
        if (decoded.userId) {
          // Admin JWT 토큰 형식
          user = await WikiUser.findById(decoded.userId)
        } else if (decoded.username) {
          // Wiki JWT 토큰 형식
          user = await WikiUser.findOne({ username: decoded.username })
        } else {
          continue
        }
        if (!user) continue
        return enforceUserAccessPolicy(user as any)
      } catch {
        continue
      }
    }

    return null
  } catch (error) {
    return null
  }
}

// 관리자 권한 확인
function isAdminOrModerator(user: any) {
  return user && user.role === 'admin'
}

// GET /api/wiki/users - 사용자 목록 조회 (관리자만)
export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    const user = await getUserFromToken(request)
    if (!isAdminOrModerator(user)) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const search = searchParams.get('search') || ''
    const role = searchParams.get('role') || ''
    const status = searchParams.get('status') || ''

    const skip = (page - 1) * limit
    let query: any = {}

    // 검색 조건
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }

    // 역할 필터
    if (role) {
      query.role = role
    }

    // 상태 필터
    if (status === 'active') {
      query.isActive = true
      query['banStatus.isBanned'] = { $ne: true }
    } else if (status === 'banned') {
      query['banStatus.isBanned'] = true
    } else if (status === 'inactive') {
      query.isActive = false
    }

    const total = await WikiUser.countDocuments(query)
    const users = await WikiUser.find(query)
      .select('-password') // 비밀번호 제외
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    return NextResponse.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('사용자 목록 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '사용자 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/wiki/users - 사용자 관리 작업 (경고, 차단 등)
export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const user = await getUserFromToken(request)
    if (!isAdminOrModerator(user)) {
      return NextResponse.json(
        { success: false, error: '권한이 없습니다.' },
        { status: 403 }
      )
    }
    const adminUser = user as any

    const { action, userId, data } = await request.json()
    
    const targetUser = await WikiUser.findById(userId)
    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 자기 자신이나 상위 권한자는 조치할 수 없음
    if (targetUser._id.toString() === adminUser._id.toString()) {
      return NextResponse.json(
        { success: false, error: '자기 자신에게는 조치를 취할 수 없습니다.' },
        { status: 400 }
      )
    }

    if (targetUser.role === 'admin') {
      return NextResponse.json(
        { success: false, error: '관리자에게는 조치를 취할 수 없습니다.' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'warn':
        // 경고 처리
        if (!targetUser.warnings) targetUser.warnings = []
        targetUser.warnings.push({
          reason: data.reason,
          warnedBy: adminUser.username,
          warnedAt: new Date()
        })
        await targetUser.save()
        
        // 디스코드 웹훅 전송
        try {
          await DiscordWebhookService.sendUserModeration(
            adminUser.username,
            targetUser.username,
            'warn',
            data.reason
          )
        } catch (error) {
          console.error('디스코드 웹훅 전송 오류:', error)
        }
        
        return NextResponse.json({
          success: true,
          message: `${targetUser.username}에게 경고를 부여했습니다.`
        })

      case 'ban':
        // 차단 처리
        const bannedUntil = data.duration > 0 
          ? new Date(Date.now() + data.duration * 24 * 60 * 60 * 1000)
          : undefined

        targetUser.banStatus = {
          isBanned: true,
          reason: data.reason,
          bannedBy: adminUser.username,
          bannedAt: new Date(),
          bannedUntil
        }
        targetUser.isActive = false
        await targetUser.save()
        
        // 디스코드 웹훅 전송
        try {
          await DiscordWebhookService.sendUserModeration(
            adminUser.username,
            targetUser.username,
            'ban',
            data.reason,
            data.duration > 0 ? `${data.duration}` : '0'
          )
        } catch (error) {
          console.error('디스코드 웹훅 전송 오류:', error)
        }
        
        return NextResponse.json({
          success: true,
          message: `${targetUser.username}을(를) 차단했습니다.`
        })

      case 'unban':
        // 차단 해제
        targetUser.banStatus = {
          isBanned: false,
          reason: '',
          unbannedBy: adminUser.username,
          unbannedAt: new Date()
        }
        targetUser.isActive = true
        await targetUser.save()
        
        // 디스코드 웹훅 전송
        try {
          await DiscordWebhookService.sendUserModeration(
            adminUser.username,
            targetUser.username,
            'unban',
            '차단 해제'
          )
        } catch (error) {
          console.error('디스코드 웹훅 전송 오류:', error)
        }
        
        return NextResponse.json({
          success: true,
          message: `${targetUser.username}의 차단을 해제했습니다.`
        })

      case 'role':
        // 권한 변경
        const allowedRoles = ['user', 'editor', 'moderator']
        if (!allowedRoles.includes(data.role)) {
          return NextResponse.json(
            { success: false, error: '유효하지 않은 권한입니다.' },
            { status: 400 }
          )
        }

        // 관리자만 moderator 권한 부여 가능
        if (data.role === 'moderator' && adminUser.role !== 'admin') {
          return NextResponse.json(
            { success: false, error: '운영자 권한은 관리자만 부여할 수 있습니다.' },
            { status: 403 }
          )
        }

        targetUser.role = data.role
        await targetUser.save()
        
        return NextResponse.json({
          success: true,
          message: `${targetUser.username}의 권한을 ${data.role}로 변경했습니다.`
        })

      default:
        return NextResponse.json(
          { success: false, error: '유효하지 않은 작업입니다.' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('사용자 관리 오류:', error)
    return NextResponse.json(
      { success: false, error: '사용자 관리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
