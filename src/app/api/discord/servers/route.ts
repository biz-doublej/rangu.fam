import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import DiscordService from '@/services/discordService'

// GET /api/discord/servers - 서버 목록 조회
export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get('guildId')
    const active = searchParams.get('active')

    if (guildId) {
      // 특정 서버 조회
      const server = await DiscordService.getServerSettings(guildId)
      if (!server) {
        return NextResponse.json(
          { success: false, error: '서버를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }
      return NextResponse.json({ success: true, data: server })
    } else if (active === 'true') {
      // 활성 서버 목록 조회
      const servers = await DiscordService.getActiveServers()
      return NextResponse.json({ success: true, data: servers })
    } else {
      return NextResponse.json(
        { success: false, error: '잘못된 요청입니다.' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('Discord servers API error:', error)
    return NextResponse.json(
      { success: false, error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/discord/servers - 서버 생성/업데이트
export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const { guildId, guildName } = await request.json()

    if (!guildId || !guildName) {
      return NextResponse.json(
        { success: false, error: 'guildId와 guildName이 필요합니다.' },
        { status: 400 }
      )
    }

    const server = await DiscordService.getOrCreateServer(guildId, guildName)
    return NextResponse.json({ success: true, data: server })
  } catch (error) {
    console.error('Discord server create/update error:', error)
    return NextResponse.json(
      { success: false, error: '서버 생성/업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT /api/discord/servers - 서버 설정 업데이트
export async function PUT(request: NextRequest) {
  try {
    await dbConnect()

    const { guildId, settings } = await request.json()

    if (!guildId || !settings) {
      return NextResponse.json(
        { success: false, error: 'guildId와 settings가 필요합니다.' },
        { status: 400 }
      )
    }

    const server = await DiscordService.updateServerSettings(guildId, settings)
    if (!server) {
      return NextResponse.json(
        { success: false, error: '서버를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: server })
  } catch (error) {
    console.error('Discord server settings update error:', error)
    return NextResponse.json(
      { success: false, error: '서버 설정 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}