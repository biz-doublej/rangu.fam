import { NextRequest, NextResponse } from 'next/server'
import {
  createWikiToken,
  enforceUserAccessPolicy,
  getAuthenticatedWikiUser,
  setWikiAuthCookie,
} from '@/lib/doublejAuth'
import { getIpAddress, formatIpForDisplay } from '@/lib/getIpAddress'
import { DiscordWebhookService } from '@/services/discordWebhookService'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedWikiUser(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'DoubleJ 통합 로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: '비활성화된 계정입니다.' },
        { status: 403 }
      )
    }

    const isBanned = Boolean((user as any).isBanned || (user as any)?.banStatus?.isBanned)
    if (isBanned) {
      return NextResponse.json(
        { success: false, error: '차단된 계정입니다.' },
        { status: 403 }
      )
    }

    user.lastLogin = new Date()
    user.lastActivity = new Date()
    await user.save()
    await enforceUserAccessPolicy(user)

    const ipAddress = getIpAddress(request)
    const formattedIp = formatIpForDisplay(ipAddress)

    try {
      const userAgent = request.headers.get('user-agent')
      await DiscordWebhookService.sendUserLogin(
        user.username,
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
        id: user._id,
        username: user.username,
        displayName: user.displayName || user.username,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        avatar: user.avatar,
        bio: user.bio,
        signature: user.signature,
        edits: user.edits,
        pagesCreated: user.pagesCreated,
        reputation: user.reputation,
      },
      loginNotification: {
        type: 'login',
        title: '위키 로그인 성공',
        message: `${user.displayName || user.username}님, 안전하게 로그인되었습니다.`,
        data: {
          ipAddress: formattedIp,
          timestamp: new Date().toISOString(),
        },
      },
    })

    setWikiAuthCookie(response, createWikiToken(user))

    return response
  } catch (error) {
    console.error('통합 위키 로그인 오류:', error)
    return NextResponse.json(
      { success: false, error: '위키 로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
