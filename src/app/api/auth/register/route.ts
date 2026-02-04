import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import dbConnect from '@/lib/mongodb'
import { WikiUser } from '@/models/Wiki'
import {
  buildClientUser,
  createDoubleJToken,
  createWikiToken,
  setDoubleJAuthCookie,
  setWikiAuthCookie,
} from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

function isValidUsername(username: string) {
  return /^[a-zA-Z0-9_-]{3,20}$/.test(username)
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const username = (body?.username || '').toString().trim()
    const password = (body?.password || '').toString()
    const displayName = (body?.displayName || username).toString().trim()

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '아이디와 비밀번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    if (!isValidUsername(username)) {
      return NextResponse.json(
        { success: false, error: '아이디는 3-20자의 영문, 숫자, _, - 만 사용할 수 있습니다.' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: '비밀번호는 8자 이상이어야 합니다.' },
        { status: 400 }
      )
    }

    await dbConnect()

    const existingUser = await WikiUser.findOne({ username })
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: '이미 사용 중인 아이디입니다.' },
        { status: 409 }
      )
    }

    let email = `${username}@doublej.local`
    const emailExists = await WikiUser.exists({ email })
    if (emailExists) {
      email = `${username}-${Date.now()}@doublej.local`
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    const createdUser = await WikiUser.create({
      username,
      email,
      password: hashedPassword,
      displayName: displayName || username,
      role: 'editor',
      permissions: {
        canEdit: true,
        canDelete: false,
        canProtect: false,
        canBan: false,
        canManageUsers: false,
      },
      edits: 0,
      pagesCreated: 0,
      discussionPosts: 0,
      reputation: 0,
      preferences: {
        theme: 'auto',
        timezone: 'Asia/Seoul',
        emailNotifications: true,
        showEmail: false,
        autoWatchPages: true,
      },
      isActive: true,
      lastLogin: new Date(),
      lastActivity: new Date(),
    })

    const response = NextResponse.json({
      success: true,
      message: '회원가입이 완료되었습니다.',
      user: buildClientUser(createdUser),
      linkedWikiUsername: createdUser.username,
    })

    setDoubleJAuthCookie(response, createDoubleJToken(createdUser))
    setWikiAuthCookie(response, createWikiToken(createdUser))

    return response
  } catch (error: any) {
    console.error('통합 회원가입 오류:', error)

    if (error?.code === 11000) {
      return NextResponse.json(
        { success: false, error: '이미 사용 중인 아이디입니다.' },
        { status: 409 }
      )
    }

    return NextResponse.json(
      { success: false, error: '회원가입 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
