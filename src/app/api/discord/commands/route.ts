import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import DiscordService from '@/services/discordService'
export const dynamic = 'force-dynamic'

// GET /api/discord/commands - 명령어 로그 조회
export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get('guildId')
    const type = searchParams.get('type') || 'logs'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const days = parseInt(searchParams.get('days') || '7')

    if (!guildId) {
      return NextResponse.json(
        { success: false, error: 'guildId가 필요합니다.' },
        { status: 400 }
      )
    }

    let data

    switch (type) {
      case 'logs':
        data = await DiscordService.getCommandLogs(guildId, limit, offset)
        break
      
      case 'stats':
        data = await DiscordService.getCommandStats(guildId, days)
        break
      
      case 'popular':
        data = await DiscordService.getPopularCommands(days)
        break
      
      default:
        return NextResponse.json(
          { success: false, error: '지원하지 않는 타입입니다.' },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Discord commands GET error:', error)
    return NextResponse.json(
      { success: false, error: '명령어 로그 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/discord/commands - 명령어 로그 추가
export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const {
      guildId,
      userId,
      username,
      command,
      args = [],
      channelId,
      channelName,
      success = true,
      error,
      executionTime = 0
    } = await request.json()

    if (!guildId || !userId || !username || !command) {
      return NextResponse.json(
        { success: false, error: 'guildId, userId, username, command가 필요합니다.' },
        { status: 400 }
      )
    }

    const log = await DiscordService.logCommand(
      guildId,
      userId,
      username,
      command,
      args,
      channelId,
      channelName,
      success,
      error,
      executionTime
    )

    return NextResponse.json({ success: true, data: log })
  } catch (error) {
    console.error('Discord command log error:', error)
    return NextResponse.json(
      { success: false, error: '명령어 로그 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}