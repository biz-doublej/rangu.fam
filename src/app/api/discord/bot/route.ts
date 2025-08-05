import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import DiscordService from '@/services/discordService'

// GET /api/discord/bot - 봇 상태 조회
export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const botId = searchParams.get('botId') || 'rangu-bot'

    const botStatus = await DiscordService.getBotStatus(botId)
    if (!botStatus) {
      return NextResponse.json(
        { success: false, error: '봇 상태를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: botStatus })
  } catch (error) {
    console.error('Discord bot GET error:', error)
    return NextResponse.json(
      { success: false, error: '봇 상태 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/discord/bot - 봇 상태 업데이트
export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const { action, botId = 'rangu-bot', ...data } = await request.json()

    if (!action) {
      return NextResponse.json(
        { success: false, error: 'action이 필요합니다.' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'updateStatus':
        const botStatus = await DiscordService.updateBotStatus(botId, data)
        return NextResponse.json({ success: true, data: botStatus })

      case 'heartbeat':
        await DiscordService.heartbeat(botId)
        return NextResponse.json({ 
          success: true, 
          message: '하트비트가 업데이트되었습니다.',
          timestamp: new Date().toISOString()
        })

      default:
        return NextResponse.json(
          { success: false, error: '지원하지 않는 액션입니다.' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('Discord bot POST error:', error)
    return NextResponse.json(
      { success: false, error: '봇 상태 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}