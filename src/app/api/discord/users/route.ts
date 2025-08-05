import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import DiscordService from '@/services/discordService'

// GET /api/discord/users - 사용자 연동 정보 조회
export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const discordId = searchParams.get('discordId')
    const linkCode = searchParams.get('linkCode')

    if (discordId) {
      const userLink = await DiscordService.getUserLink(discordId)
      if (!userLink) {
        return NextResponse.json(
          { success: false, error: '연동된 사용자를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }
      return NextResponse.json({ success: true, data: userLink })
    } else if (linkCode) {
      const userLink = await DiscordService.getUserLinkByCode(linkCode)
      if (!userLink) {
        return NextResponse.json(
          { success: false, error: '유효하지 않은 연동 코드입니다.' },
          { status: 404 }
        )
      }
      return NextResponse.json({ success: true, data: userLink })
    } else {
      return NextResponse.json(
        { success: false, error: 'discordId 또는 linkCode가 필요합니다.' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Discord users GET error:', error)
    return NextResponse.json(
      { success: false, error: '사용자 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/discord/users - 연동 코드 생성 또는 사용자 연동
export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const { action, discordId, discordUsername, linkCode, siteUserId, siteUsername } = await request.json()

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'action이 필요합니다.' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'generateCode':
        if (!discordId || !discordUsername) {
          return NextResponse.json(
            { success: false, error: 'discordId와 discordUsername이 필요합니다.' },
            { status: 400 }
          )
        }
        
        const code = await DiscordService.generateLinkCode(discordId, discordUsername)
        return NextResponse.json({ 
          success: true, 
          data: { linkCode: code },
          message: '연동 코드가 생성되었습니다. 웹사이트에서 코드를 입력해주세요.'
        })

      case 'linkUser':
        if (!linkCode || !siteUserId || !siteUsername) {
          return NextResponse.json(
            { success: false, error: 'linkCode, siteUserId, siteUsername이 필요합니다.' },
            { status: 400 }
          )
        }
        
        const userLink = await DiscordService.linkUser(linkCode, siteUserId, siteUsername)
        if (!userLink) {
          return NextResponse.json(
            { success: false, error: '유효하지 않은 연동 코드입니다.' },
            { status: 400 }
          )
        }
        
        return NextResponse.json({ 
          success: true, 
          data: userLink,
          message: '디스코드 계정이 성공적으로 연동되었습니다.'
        })

      default:
        return NextResponse.json(
          { success: false, error: '지원하지 않는 액션입니다.' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Discord users POST error:', error)
    return NextResponse.json(
      { success: false, error: '사용자 연동 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT /api/discord/users - 사용자 권한 업데이트
export async function PUT(request: NextRequest) {
  try {
    await dbConnect()

    const { discordId, permissions } = await request.json()

    if (!discordId || !permissions) {
      return NextResponse.json(
        { success: false, error: 'discordId와 permissions가 필요합니다.' },
        { status: 400 }
      )
    }

    const userLink = await DiscordService.updateUserPermissions(discordId, permissions)
    if (!userLink) {
      return NextResponse.json(
        { success: false, error: '연동된 사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: userLink })
  } catch (error) {
    console.error('Discord users PUT error:', error)
    return NextResponse.json(
      { success: false, error: '권한 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}