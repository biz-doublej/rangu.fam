import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import DiscordService from '@/services/discordService'
import Track from '@/models/Track'

// POST /api/discord/sync - 웹사이트와 디스코드 큐 동기화
export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const { action, guildId, trackId, playlistId, ...data } = await request.json()

    if (!action || !guildId) {
      return NextResponse.json(
        { success: false, error: 'action과 guildId가 필요합니다.' },
        { status: 400 }
      )
    }

    let result

    switch (action) {
      case 'add_track':
        // 웹사이트에서 선택한 트랙을 디스코드 큐에 추가
        if (!trackId) {
          return NextResponse.json(
            { success: false, error: 'trackId가 필요합니다.' },
            { status: 400 }
          )
        }

        const track = await Track.findById(trackId)
        if (!track) {
          return NextResponse.json(
            { success: false, error: '트랙을 찾을 수 없습니다.' },
            { status: 404 }
          )
        }

        result = await DiscordService.addToQueue(guildId, {
          trackId: track._id,
          title: track.title,
          artist: track.artist,
          youtubeId: track.youtubeId,
          duration: track.duration,
          requestedBy: {
            userId: data.userId || 'website',
            username: data.username || 'Website'
          }
        })
        break

      case 'add_playlist':
        // 웹사이트 플레이리스트를 디스코드 큐에 추가
        if (!playlistId) {
          return NextResponse.json(
            { success: false, error: 'playlistId가 필요합니다.' },
            { status: 400 }
          )
        }

        // 플레이리스트 로직은 나중에 구현
        return NextResponse.json(
          { success: false, error: '플레이리스트 동기화는 아직 구현되지 않았습니다.' },
          { status: 501 }
        )

      case 'get_current_queue':
        // 현재 디스코드 큐 상태를 웹사이트로 전송
        const queue = await DiscordService.getQueue(guildId)
        return NextResponse.json({ success: true, data: queue })

      case 'control_playback':
        // 웹사이트에서 디스코드 재생 제어
        const { command } = data
        if (!command) {
          return NextResponse.json(
            { success: false, error: 'command가 필요합니다.' },
            { status: 400 }
          )
        }

        switch (command) {
          case 'play':
            result = await DiscordService.updateQueueState(guildId, { isPlaying: true, isPaused: false })
            break
          case 'pause':
            result = await DiscordService.updateQueueState(guildId, { isPlaying: false, isPaused: true })
            break
          case 'stop':
            result = await DiscordService.updateQueueState(guildId, { isPlaying: false, isPaused: false })
            break
          case 'next':
            result = await DiscordService.nextTrack(guildId)
            break
          case 'previous':
            result = await DiscordService.previousTrack(guildId)
            break
          case 'clear':
            result = await DiscordService.clearQueue(guildId)
            break
          default:
            return NextResponse.json(
              { success: false, error: `지원하지 않는 명령어: ${command}` },
              { status: 400 }
            )
        }
        break

      case 'update_settings':
        // 디스코드 서버 설정 업데이트
        const { settings } = data
        if (!settings) {
          return NextResponse.json(
            { success: false, error: 'settings가 필요합니다.' },
            { status: 400 }
          )
        }

        result = await DiscordService.updateServerSettings(guildId, settings)
        break

      default:
        return NextResponse.json(
          { success: false, error: `지원하지 않는 액션: ${action}` },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: `동기화 완료: ${action}`
    })
  } catch (error) {
    console.error('Discord sync error:', error)
    return NextResponse.json(
      { success: false, error: '동기화 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// GET /api/discord/sync - 동기화 상태 조회
export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const guildId = searchParams.get('guildId')

    if (!guildId) {
      return NextResponse.json(
        { success: false, error: 'guildId가 필요합니다.' },
        { status: 400 }
      )
    }

    // 서버 설정과 큐 상태를 함께 조회
    const [server, queue] = await Promise.all([
      DiscordService.getServerSettings(guildId),
      DiscordService.getQueue(guildId)
    ])

    return NextResponse.json({
      success: true,
      data: {
        server,
        queue,
        isConnected: !!server?.isActive,
        lastSync: queue?.lastUpdated || server?.lastActivity
      }
    })
  } catch (error) {
    console.error('Discord sync status error:', error)
    return NextResponse.json(
      { success: false, error: '동기화 상태 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}