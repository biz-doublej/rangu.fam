import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import bcrypt from 'bcryptjs'
import { authOptions } from '@/lib/authOptions'
import dbConnect from '@/lib/mongodb'
import { WikiUser } from '@/models/Wiki'
import DiscordLink from '@/models/DiscordLink'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user?.discordId) {
      return NextResponse.json(
        { success: false, error: 'Discord 로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: '위키 아이디와 비밀번호를 입력해주세요.' },
        { status: 400 }
      )
    }

    await dbConnect()

    const wikiUser = await WikiUser.findOne({
      $or: [{ username }, { email: username }],
    })

    if (!wikiUser) {
      return NextResponse.json(
        { success: false, error: '존재하지 않는 위키 계정입니다.' },
        { status: 404 }
      )
    }

    const isValidPassword = await bcrypt.compare(password, wikiUser.password)
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: '비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      )
    }

    wikiUser.discordId = session.user.discordId
    wikiUser.discordUsername = session.user.name || wikiUser.discordUsername
    wikiUser.discordAvatar = session.user.image || wikiUser.discordAvatar
    await wikiUser.save()

    await DiscordLink.findOneAndUpdate(
      { discordId: session.user.discordId },
      {
        discordUsername: session.user.name,
        discordAvatar: session.user.image,
        wikiUserId: wikiUser._id,
        wikiUsername: wikiUser.username,
        wikiLinkedAt: new Date(),
      },
      { upsert: true }
    )

    return NextResponse.json({ success: true, message: '위키 계정이 연동되었습니다.' })
  } catch (error) {
    console.error('Wiki link error:', error)
    return NextResponse.json(
      { success: false, error: '위키 계정 연동에 실패했습니다.' },
      { status: 500 }
    )
  }
}
