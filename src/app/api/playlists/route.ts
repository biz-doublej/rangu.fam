import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Playlist from '@/models/Playlist'
import User from '@/models/User'
import Track from '@/models/Track'
export const dynamic = 'force-dynamic'

// GET - 모든 플레이리스트 또는 필터링된 플레이리스트 가져오기
export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search')
    const userId = searchParams.get('userId')
    const isPublic = searchParams.get('isPublic')

    // 필터 조건 구성
    const filter: any = {}
    
    if (isPublic !== null) {
      filter.isPublic = isPublic === 'true'
    } else {
      filter.isPublic = true // 기본적으로 공개 플레이리스트만
    }

    if (userId) {
      filter.createdById = userId
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ]
    }

    const skip = (page - 1) * limit

    // 플레이리스트 조회 (populate로 관련 데이터 포함)
    const playlists = await Playlist.find(filter)
      .populate('createdById', 'username profileImage')
      .populate('tracksIds', 'title artist coverImage duration')
      .populate('followersIds', 'username profileImage')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await Playlist.countDocuments(filter)

    return NextResponse.json({
      success: true,
      playlists,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('플레이리스트 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '플레이리스트를 가져오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

// POST - 새 플레이리스트 생성
export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const body = await request.json()
    const {
      name,
      description,
      tracksIds,
      tags,
      isPublic,
      isCollaborative,
      createdBy,
      createdById
    } = body

    // 필수 필드 검증
    if (!name || !createdBy || !createdById) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 사용자 존재 확인
    const user = await User.findById(createdById)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '사용자를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 트랙 존재 확인 (있는 경우)
    if (tracksIds && tracksIds.length > 0) {
      const validTracks = await Track.find({ _id: { $in: tracksIds } })
      if (validTracks.length !== tracksIds.length) {
        return NextResponse.json(
          { success: false, error: '일부 트랙을 찾을 수 없습니다.' },
          { status: 400 }
        )
      }
    }

    // 총 재생 시간 계산
    let totalDuration = 0
    if (tracksIds && tracksIds.length > 0) {
      const tracks = await Track.find({ _id: { $in: tracksIds } }, 'duration')
      totalDuration = tracks.reduce((sum, track) => sum + (track.duration || 0), 0)
    }

    // 새 플레이리스트 생성
    const newPlaylist = new Playlist({
      name,
      description: description || '',
      tracksIds: tracksIds || [],
      createdBy,
      createdById,
      tags: tags || [],
      isPublic: isPublic !== false, // 기본값 true
      isCollaborative: isCollaborative || false,
      totalDuration
    })

    const savedPlaylist = await newPlaylist.save()

    // 사용자의 플레이리스트 목록에 추가
    await User.findByIdAndUpdate(createdById, {
      $push: { playlistsIds: savedPlaylist._id }
    })

    // 생성된 플레이리스트를 populate하여 반환
    const populatedPlaylist = await Playlist.findById(savedPlaylist._id)
      .populate('createdById', 'username profileImage')
      .populate('tracksIds', 'title artist coverImage duration')
      .lean()

    return NextResponse.json({
      success: true,
      playlist: populatedPlaylist
    }, { status: 201 })

  } catch (error) {
    console.error('플레이리스트 생성 오류:', error)
    return NextResponse.json(
      { success: false, error: '플레이리스트 생성에 실패했습니다.' },
      { status: 500 }
    )
  }
} 