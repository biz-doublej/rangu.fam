import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import DiscordService from '@/services/discordService'

// POST /api/discord/webhook - 디스코드 봇에서 오는 웹훅 처리
export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const {
      type,
      guildId,
      data,
      timestamp = new Date().toISOString()
    } = await request.json()

    if (!type || !guildId) {
      return NextResponse.json(
        { success: false, error: 'type과 guildId가 필요합니다.' },
        { status: 400 }
      )
    }

    let result

    switch (type) {
      case 'track_start':
        // 트랙 재생 시작
        result = await DiscordService.updateQueueState(guildId, {
          isPlaying: true,
          isPaused: false,
          currentTrackIndex: data.trackIndex || 0
        })
        break

      case 'track_end':
        // 트랙 재생 종료
        result = await DiscordService.updateQueueState(guildId, {
          isPlaying: false
        })
        break

      case 'track_pause':
        // 트랙 일시정지
        result = await DiscordService.updateQueueState(guildId, {
          isPlaying: false,
          isPaused: true
        })
        break

      case 'track_resume':
        // 트랙 재생 재개
        result = await DiscordService.updateQueueState(guildId, {
          isPlaying: true,
          isPaused: false
        })
        break

      case 'queue_update':
        // 큐 업데이트
        result = await DiscordService.updateQueueState(guildId, data)
        break

      case 'voice_join':
        // 음성 채널 입장
        result = await DiscordService.updateQueueState(guildId, {
          voiceChannelId: data.channelId
        })
        break

      case 'voice_leave':
        // 음성 채널 나가기
        result = await DiscordService.updateQueueState(guildId, {
          voiceChannelId: undefined,
          isPlaying: false,
          isPaused: false
        })
        break

      case 'command_executed':
        // 명령어 실행 로그
        result = await DiscordService.logCommand(
          guildId,
          data.userId,
          data.username,
          data.command,
          data.args || [],
          data.channelId,
          data.channelName,
          data.success || true,
          data.error,
          data.executionTime || 0
        )
        break

      case 'server_join':
        // 새 서버 추가
        result = await DiscordService.getOrCreateServer(guildId, data.guildName)
        break

      case 'server_leave':
        // 서버에서 나가기
        const server = await DiscordService.getServerSettings(guildId)
        if (server) {
          result = await DiscordService.updateServerSettings(guildId, { 
            ...server.settings,
            enableNotifications: false 
          })
        }
        break

      case 'sync_website_track':
        // 웹사이트 트랙을 디스코드 큐와 동기화
        result = await DiscordService.syncWebsiteTrack(guildId, data.trackId)
        break

      default:
        return NextResponse.json(
          { success: false, error: `지원하지 않는 웹훅 타입: ${type}` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `웹훅 처리 완료: ${type}`,
      timestamp
    })
  } catch (error) {
    console.error('Discord webhook error:', error)
    return NextResponse.json(
      { success: false, error: '웹훅 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// GET /api/discord/webhook - 웹훅 상태 확인 (헬스체크)
export async function GET() {
  try {
    await dbConnect()

    return NextResponse.json({
      success: true,
      message: 'Discord webhook endpoint is healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    })
  } catch (error) {
    console.error('Discord webhook health check error:', error)
    return NextResponse.json(
      { success: false, error: '웹훅 서비스에 문제가 있습니다.' },
      { status: 500 }
    )
  }
}