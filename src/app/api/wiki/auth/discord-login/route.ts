import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import jwt from 'jsonwebtoken'
import dbConnect from '@/lib/mongodb'
import { WikiUser } from '@/models/Wiki'
import { authOptions } from '@/lib/authOptions'
import { getIpAddress, formatIpForDisplay } from '@/lib/getIpAddress'
import { DiscordWebhookService } from '@/services/discordWebhookService'

const JWT_SECRET = process.env.JWT_SECRET || 'rangu-wiki-secret'
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

    await dbConnect()
    const wikiUser = await WikiUser.findOne({ discordId: session.user.discordId })

    if (!wikiUser) {
      return NextResponse.json(
        { success: false, error: '연동된 위키 계정을 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    const token = jwt.sign(
      {
        userId: wikiUser._id,
        username: wikiUser.username,
        role: wikiUser.role,
        permissions: wikiUser.permissions,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    const ipAddress = getIpAddress(request)
    const formattedIp = formatIpForDisplay(ipAddress)

    wikiUser.lastLogin = new Date()
    wikiUser.lastActivity = new Date()
    wikiUser.lastLoginIp = ipAddress
    await wikiUser.save()

    try {
      const userAgent = request.headers.get('user-agent')
      await DiscordWebhookService.sendUserLogin(
        wikiUser.username,
        ipAddress,
        userAgent || undefined
      )
    } catch (webhookError) {
      console.error('Discord webhook 전송 실패:', webhookError)
    }

    const response = NextResponse.json({
      success: true,
      message: '위키 로그인이 완료되었습니다.',
      user: {
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
      },
      loginNotification: {
        type: 'login',
        title: '디스코드 로그인 성공',
        message: `${wikiUser.displayName || wikiUser.username}님, 안전하게 로그인되었습니다.`,
        data: {
          ipAddress: formattedIp,
          timestamp: new Date().toISOString(),
        },
      },
    })

    response.cookies.set('wiki-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
    })

    return response
  } catch (error) {
    console.error('Discord wiki 로그인 오류:', error)
    return NextResponse.json(
      { success: false, error: '위키 로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
