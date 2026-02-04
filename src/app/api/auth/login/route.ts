import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import dbConnect from '@/lib/mongodb'
import { WikiUser } from '@/models/Wiki'
import {
  buildClientUser,
  createDoubleJToken,
  createWikiToken,
  enforceUserAccessPolicy,
  mergeSignupIdentityIntoDiscordIdentity,
  resolveMemberIdForUser,
  setDoubleJAuthCookie,
  setWikiAuthCookie,
} from '@/lib/doublejAuth'
import { MemberService } from '@/backend/services/memberService'

export const dynamic = 'force-dynamic'

function isBannedUser(user: any) {
  return Boolean(user?.isBanned || user?.banStatus?.isBanned)
}

function getBanReason(user: any) {
  return user?.banReason || user?.banStatus?.reason
}

async function verifyPassword(inputPassword: string, storedPassword: string) {
  if (!storedPassword) return false
  if (storedPassword.startsWith('$2')) {
    return bcrypt.compare(inputPassword, storedPassword)
  }
  return storedPassword === inputPassword
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const username = (body?.username || '').toString().trim()
    const password = (body?.password || '').toString()

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '아이디와 비밀번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    await dbConnect()
    const user = await WikiUser.findOne({ username })

    if (!user) {
      return NextResponse.json(
        { success: false, error: '존재하지 않는 사용자입니다.' },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: '비활성화된 계정입니다.' },
        { status: 403 }
      )
    }

    if (isBannedUser(user)) {
      const reason = getBanReason(user)
      const message = reason ? `차단된 계정입니다. 사유: ${reason}` : '차단된 계정입니다.'
      return NextResponse.json({ success: false, error: message }, { status: 403 })
    }

    const passwordMatches = await verifyPassword(password, user.password)
    if (!passwordMatches) {
      return NextResponse.json(
        { success: false, error: '비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    // 레거시 평문 계정 자동 마이그레이션
    if (!user.password.startsWith('$2')) {
      user.password = await bcrypt.hash(password, 12)
    }

    user.lastLogin = new Date()
    user.lastActivity = new Date()
    await user.save()
    const canonicalUser = await mergeSignupIdentityIntoDiscordIdentity(
      user,
      user.discordUsername || user.discordId
    )
    if (!canonicalUser) {
      return NextResponse.json(
        { success: false, error: '계정 병합 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
    await enforceUserAccessPolicy(canonicalUser)

    const memberId = resolveMemberIdForUser(canonicalUser)
    const memberProfile = memberId ? await MemberService.getMember(memberId).catch(() => null) : null

    const response = NextResponse.json({
      success: true,
      message: '로그인되었습니다.',
      user: buildClientUser(canonicalUser),
      memberProfile,
      linkedWikiUsername: canonicalUser.username,
    })

    setDoubleJAuthCookie(response, createDoubleJToken(canonicalUser))
    setWikiAuthCookie(response, createWikiToken(canonicalUser))

    return response
  } catch (error) {
    console.error('통합 로그인 오류:', error)
    return NextResponse.json(
      { success: false, error: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
