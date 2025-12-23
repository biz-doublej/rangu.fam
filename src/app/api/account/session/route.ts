import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/authOptions'
import dbConnect from '@/lib/mongodb'
import DiscordLink, { IDiscordLink } from '@/models/DiscordLink'
import { MemberService } from '@/backend/services/memberService'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user?.discordId) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    await dbConnect()

    const update = {
      discordUsername: session.user.name || session.user.email || undefined,
      discordAvatar: session.user.image || undefined,
    }

    const link = await DiscordLink.findOneAndUpdate(
      { discordId: session.user.discordId },
      { $setOnInsert: { discordId: session.user.discordId }, $set: update },
      { new: true, upsert: true }
    ).lean<IDiscordLink>()

    let memberProfile = null
    if (link?.memberId) {
      memberProfile = await MemberService.getMember(link.memberId)
    }

    return NextResponse.json({
      success: true,
      data: {
        discordId: session.user.discordId,
        discordUsername: link?.discordUsername || session.user.name,
        discordAvatar: link?.discordAvatar || session.user.image,
        memberId: link?.memberId || null,
        memberLinkedAt: link?.memberLinkedAt || null,
        memberProfile,
        wikiUsername: link?.wikiUsername || null,
        wikiLinkedAt: link?.wikiLinkedAt || null,
      },
    })
  } catch (error) {
    console.error('Account session error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch account session' },
      { status: 500 }
    )
  }
}
