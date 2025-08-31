import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Track from '@/models/Track'
import User from '@/models/User'
import Comment from '@/models/Comment'
export const dynamic = 'force-dynamic'

// GET - 모든 트랙 또는 필터링된 트랙 가져오기
export async function GET(request: NextRequest) {
  try {
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const genre = searchParams.get('genre')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'recent'
    const userId = searchParams.get('userId')

    // 필터 조건 구성
    const filter: any = { isPublic: true }
    
    if (genre && genre !== 'all') {
      filter.genre = genre
    }

    if (userId) {
      filter.uploadedById = userId
    }

    if (search) {
      filter.$text = { $search: search }
    }

    // 정렬 조건 구성
    let sort: any = {}
    switch (sortBy) {
      case 'popular':
        sort = { plays: -1, likes: -1 }
        break
      case 'alphabetical':
        sort = { title: 1 }
        break
      case 'recent':
      default:
        sort = { createdAt: -1 }
        break
    }

    const skip = (page - 1) * limit

    // 트랙 조회 (간단한 조회로 변경)
    const tracks = await Track.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean()

    const total = await Track.countDocuments(filter)

    return NextResponse.json({
      success: true,
      tracks,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('트랙 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '트랙을 가져오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

// POST - 새 트랙 업로드
export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const body = await request.json()
    const {
      title,
      artist,
      album,
      duration,
      youtubeId,
      soundcloudUrl,
      sourceType,
      genre,
      tags,
      description,
      uploadedBy,
      uploadedById
    } = body

    // 필수 필드 검증
    if (!title || !artist || !genre || !uploadedBy || !uploadedById || !sourceType) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }

    // 소스 타입별 필수 필드 검증
    if (sourceType === 'youtube' && !youtubeId) {
      return NextResponse.json(
        { success: false, error: 'YouTube URL이 필요합니다.' },
        { status: 400 }
      )
    }

    if (sourceType === 'soundcloud' && !soundcloudUrl) {
      return NextResponse.json(
        { success: false, error: 'SoundCloud URL이 필요합니다.' },
        { status: 400 }
      )
    }

    // 사용자 존재 확인 또는 생성
    let user = await User.findOne({ username: uploadedById })
    if (!user) {
      // 사용자가 없으면 새로 생성 (임시)
      user = new User({
        username: uploadedById,
        email: `${uploadedById}@rangu.fam`,
        password: 'temp123', // 임시 비밀번호
        role: 'member'
      })
      await user.save()
      console.log(`새 사용자 생성: ${uploadedById}`)
    }

    // 소스 타입에 따른 커버 이미지 설정
    let coverImage = '/images/default-music-cover.jpg'
    if (sourceType === 'youtube' && youtubeId) {
      coverImage = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`
    }

    // 새 트랙 생성
    const trackData: any = {
      title,
      artist,
      album: album || '',
      duration: duration || 0,
      sourceType,
      coverImage,
      uploadedBy,
      uploadedById: user._id,
      genre,
      tags: tags || [],
      description: description || ''
    }

    // 소스 타입별 필드 추가
    if (sourceType === 'youtube') {
      trackData.youtubeId = youtubeId
    } else if (sourceType === 'soundcloud') {
      trackData.soundcloudUrl = soundcloudUrl
    }

    const newTrack = new Track(trackData)

    const savedTrack = await newTrack.save()

    // 사용자의 플레이리스트에 추가 (선택사항)
    await User.findByIdAndUpdate(user._id, {
      $inc: { totalPlays: 1 }
    })

    return NextResponse.json({
      success: true,
      track: savedTrack
    }, { status: 201 })

  } catch (error) {
    console.error('트랙 업로드 오류:', error)
    return NextResponse.json(
      { success: false, error: '트랙 업로드에 실패했습니다.' },
      { status: 500 }
    )
  }
} 