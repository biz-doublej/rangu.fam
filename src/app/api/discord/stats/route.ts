import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import DiscordService from '@/services/discordService'
export const dynamic = 'force-dynamic'

// GET /api/discord/stats - 디스코드 봇 통계 조회
export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'overview'
    const guildId = searchParams.get('guildId')
    const days = parseInt(searchParams.get('days') || '7')

    let data

    switch (type) {
      case 'overview':
        // 전체 통계 개요
        const [activeServers, popularCommands] = await Promise.all([
          DiscordService.getActiveServers(),
          DiscordService.getPopularCommands(days)
        ])

        data = {
          activeServers: {
            count: activeServers.length,
            list: activeServers.slice(0, 10) // 상위 10개만
          },
          popularCommands: popularCommands,
          period: `${days}일`
        }
        break

      case 'servers':
        // 서버별 통계
        data = await DiscordService.getActiveServers()
        break

      case 'commands':
        // 명령어 통계
        if (guildId) {
          data = await DiscordService.getCommandStats(guildId, days)
        } else {
          data = await DiscordService.getPopularCommands(days)
        }
        break

      case 'usage':
        // 사용량 통계 (시간대별, 일별 등)
        const endDate = new Date()
        const startDate = new Date()
        startDate.setDate(startDate.getDate() - days)

        // 간단한 집계 - 실제로는 더 복잡한 로직 필요
        data = {
          period: { start: startDate, end: endDate },
          totalCommands: 0,
          uniqueUsers: 0,
          peakHours: [],
          // 실제 구현 시 MongoDB aggregate pipeline 사용
        }
        break

      default:
        return NextResponse.json(
          { success: false, error: '지원하지 않는 통계 타입입니다.' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Discord stats error:', error)
    return NextResponse.json(
      { success: false, error: '통계 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}