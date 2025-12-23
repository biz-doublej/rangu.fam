import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import dbConnect from '@/lib/mongodb'
import DiscordLink, { IDiscordLink } from '@/models/DiscordLink'
import { MemberService } from '@/backend/services/memberService'

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

    const { memberId } = await request.json()

    if (!memberId) {
      return NextResponse.json(
        { success: false, error: '연동할 멤버 아이디를 선택해주세요.' },
        { status: 400 }
      )
    }

    const member = await MemberService.getMember(memberId)
    if (!member) {
      return NextResponse.json(
        { success: false, error: '존재하지 않는 멤버입니다.' },
        { status: 404 }
      )
    }

    await dbConnect()
    const updated = await DiscordLink.findOneAndUpdate(
      { discordId: session.user.discordId },
      {
        discordUsername: session.user.name,
        discordAvatar: session.user.image,
        memberId,
        memberLinkedAt: new Date(),
      },
      { new: true, upsert: true }
    ).lean<IDiscordLink>()

    if (!updated) {
      return NextResponse.json(
        { success: false, error: '멤버 연동에 실패했습니다.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        memberId: updated.memberId,
        memberLinkedAt: updated.memberLinkedAt,
        memberProfile: member,
      },
    })
  } catch (error) {
    console.error('Member link error:', error)
    return NextResponse.json(
      { success: false, error: '멤버 연동에 실패했습니다.' },
      { status: 500 }
    )
  }
}
