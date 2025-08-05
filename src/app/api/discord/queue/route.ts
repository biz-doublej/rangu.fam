import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import DiscordService from '@/services/discordService'

// GET /api/discord/queue - 음악 큐 조회
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

    const queue = await DiscordService.getQueue(guildId)
    if (!queue) {
      // 큐가 없으면 새로 생성
      const newQueue = await DiscordService.getOrCreateQueue(guildId)
      return NextResponse.json({ success: true, data: newQueue })
    }

    return NextResponse.json({ success: true, data: queue })
  } catch (error) {
    console.error('Discord queue GET error:', error)
    return NextResponse.json(
      { success: false, error: '큐 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST /api/discord/queue - 큐에 트랙 추가
export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const { guildId, track } = await request.json()

    if (!guildId || !track) {
      return NextResponse.json(
        { success: false, error: 'guildId와 track 정보가 필요합니다.' },
        { status: 400 }
      )
    }

    if (!track.trackId || !track.title) {
      return NextResponse.json(
        { success: false, error: 'track.trackId와 track.title이 필요합니다.' },
        { status: 400 }
      )
    }

    const queue = await DiscordService.addToQueue(guildId, track)
    return NextResponse.json({ success: true, data: queue })
  } catch (error) {
    console.error('Discord queue POST error:', error)
    return NextResponse.json(
      { success: false, error: '트랙 추가 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT /api/discord/queue - 큐 상태 업데이트
export async function PUT(request: NextRequest) {
  try {
    await dbConnect()

    const { guildId, action, ...data } = await request.json()

    if (!guildId || !action) {
      return NextResponse.json(
        { success: false, error: 'guildId와 action이 필요합니다.' },
        { status: 400 }
      )
    }

    let queue

    switch (action) {
      case 'updateState':
        queue = await DiscordService.updateQueueState(guildId, data)
        break
      
      case 'next':
        queue = await DiscordService.nextTrack(guildId)
        break
      
      case 'previous':
        queue = await DiscordService.previousTrack(guildId)
        break
      
      case 'remove':
        if (typeof data.index !== 'number') {
          return NextResponse.json(
            { success: false, error: 'index가 필요합니다.' },
            { status: 400 }
          )
        }
        queue = await DiscordService.removeFromQueue(guildId, data.index)
        break
      
      case 'clear':
        queue = await DiscordService.clearQueue(guildId)
        break
      
      default:
        return NextResponse.json(
          { success: false, error: '지원하지 않는 액션입니다.' },
          { status: 400 }
        )
    }

    if (!queue) {
      return NextResponse.json(
        { success: false, error: '큐를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: queue })
  } catch (error) {
    console.error('Discord queue PUT error:', error)
    return NextResponse.json(
      { success: false, error: '큐 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}