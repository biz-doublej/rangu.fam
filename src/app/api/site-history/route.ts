import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/database'
import SiteHistory from '@/models/SiteHistory'
export const dynamic = 'force-dynamic'

// GET - 사이트 히스토리 조회
export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') // 'events', 'milestones', 'stats', 'all'
    
    let siteHistory = await SiteHistory.findOne().lean() as any
    
    // 기본 사이트 히스토리가 없으면 생성
    if (!siteHistory) {
      const defaultHistory = new SiteHistory({
        siteName: 'Rangu.fam',
        siteDescription: '네 친구들의 소중한 공간',
        formationDate: new Date('2023-06-06T11:45:00+09:00'),
        completeDate: new Date('2023-06-11T01:10:00+09:00'),
        siteCreationDate: new Date('2024-01-01T00:00:00+09:00'),
        events: [
          {
            title: 'Rangu.fam 결성',
            description: '인스타그램 그룹방이 생성되며 네 친구의 여정이 시작되었습니다.',
            date: new Date('2023-06-06T11:45:00+09:00'),
            type: 'formation',
            icon: '🎉',
            color: 'primary',
            importance: 5,
            isPublic: true
          },
          {
            title: '완전체 구성',
            description: '정민석이 합류하며 Rangu.fam이 완전체가 되었습니다.',
            date: new Date('2023-06-11T01:10:00+09:00'),
            type: 'member',
            icon: '👥',
            color: 'secondary',
            importance: 5,
            isPublic: true
          },
          {
            title: '1주년 기념',
            description: 'Rangu.fam 결성 1주년을 맞이했습니다.',
            date: new Date('2024-06-06T00:00:00+09:00'),
            type: 'anniversary',
            icon: '🎂',
            color: 'primary',
            importance: 4,
            isPublic: true,
            isAnniversary: true
          },
          {
            title: '2주년 기념',
            description: 'Rangu.fam 결성 2주년을 맞이했습니다.',
            date: new Date('2025-06-06T00:00:00+09:00'),
            type: 'anniversary',
            icon: '🎉',
            color: 'primary',
            importance: 4,
            isPublic: true,
            isAnniversary: true
          },
          {
            title: '이승찬 임시멤버 합류',
            description: '정진규의 군 입대로 인해 이승찬이 임시멤버로 합류했습니다.',
            date: new Date('2025-07-21T00:00:00+09:00'),
            type: 'member',
            icon: '👋',
            color: 'secondary',
            importance: 4,
            isPublic: true
          },
          {
            title: '이승찬 정식멤버 합류',
            description: '임시 활동을 마치고 이승찬이 랑구팸 정식 멤버로 승격되었습니다.',
            date: new Date('2025-12-27T00:00:00+09:00'),
            type: 'member',
            icon: '👋',
            color: 'secondary',
            importance: 4,
            isPublic: true
          }
        ],
        milestones: [
          {
            name: '100일',
            type: 'formation',
            targetDays: 100,
            emoji: '💯',
            color: 'primary',
            isCompleted: true,
            completedDate: new Date('2023-09-14T11:45:00+09:00')
          },
          {
            name: '365일 (1주년)',
            type: 'formation',
            targetDays: 365,
            emoji: '🎂',
            color: 'primary',
            isCompleted: true,
            completedDate: new Date('2024-06-06T11:45:00+09:00')
          },
          {
            name: '500일',
            type: 'formation',
            targetDays: 500,
            emoji: '🌟',
            color: 'secondary',
            isCompleted: true,
            completedDate: new Date('2024-10-19T11:45:00+09:00')
          },
          {
            name: '730일 (2주년)',
            type: 'formation',
            targetDays: 730,
            emoji: '🎉',
            color: 'primary',
            isCompleted: true,
            completedDate: new Date('2025-06-06T11:45:00+09:00')
          },
          {
            name: '1000일',
            type: 'formation',
            targetDays: 1000,
            emoji: '🚀',
            color: 'accent',
            isCompleted: false
          },
          {
            name: '1095일 (3주년)',
            type: 'formation',
            targetDays: 1095,
            emoji: '🎊',
            color: 'primary',
            isCompleted: false
          },
          {
            name: '1500일',
            type: 'formation',
            targetDays: 1500,
            emoji: '💎',
            color: 'luxury',
            isCompleted: false
          },
          {
            name: '1460일 (4주년)',
            type: 'formation',
            targetDays: 1460,
            emoji: '👑',
            color: 'primary',
            isCompleted: false
          },
          {
            name: '2000일',
            type: 'formation',
            targetDays: 2000,
            emoji: '🌈',
            color: 'rainbow',
            isCompleted: false
          }
        ],
        stats: {
          totalVisits: 0,
          uniqueVisitors: 0,
          totalPages: 8,
          totalUsers: 5,
          totalPosts: 0,
          totalComments: 0,
          totalLikes: 0,
          totalMusicPlays: 0,
          totalGameScores: 0
        }
      })
      
      siteHistory = await defaultHistory.save()
    }
    
    // 타입에 따라 응답 필터링
    let responseData
    switch (type) {
      case 'events':
        responseData = { events: siteHistory.events }
        break
      case 'milestones':
        responseData = { milestones: siteHistory.milestones }
        break
      case 'stats':
        responseData = { stats: siteHistory.stats }
        break
      default:
        responseData = siteHistory
    }
    
    return NextResponse.json({
      success: true,
      data: responseData
    })
    
  } catch (error) {
    console.error('사이트 히스토리 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '사이트 히스토리를 불러오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

// POST - 새 이벤트 추가
export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const body = await request.json()
    const { type, eventData, milestoneData } = body
    
    let siteHistory = await SiteHistory.findOne()
    
    if (!siteHistory) {
      return NextResponse.json(
        { success: false, error: '사이트 히스토리를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    if (type === 'event' && eventData) {
      siteHistory.events.push(eventData)
    } else if (type === 'milestone' && milestoneData) {
      siteHistory.milestones.push(milestoneData)
    }
    
    await siteHistory.save()
    
    return NextResponse.json({
      success: true,
      data: siteHistory
    })
    
  } catch (error) {
    console.error('사이트 히스토리 추가 오류:', error)
    return NextResponse.json(
      { success: false, error: '데이터 추가에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// PUT - 통계 업데이트
export async function PUT(request: NextRequest) {
  try {
    await dbConnect()
    
    const body = await request.json()
    const { statsUpdate } = body
    
    let siteHistory = await SiteHistory.findOne()
    
    if (!siteHistory) {
      return NextResponse.json(
        { success: false, error: '사이트 히스토리를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    // 통계 업데이트
    if (statsUpdate) {
      Object.keys(statsUpdate).forEach(key => {
        if (key in siteHistory.stats) {
          siteHistory.stats[key] += statsUpdate[key]
        }
      })
    }
    
    await siteHistory.save()
    
    return NextResponse.json({
      success: true,
      data: siteHistory
    })
    
  } catch (error) {
    console.error('사이트 히스토리 업데이트 오류:', error)
    return NextResponse.json(
      { success: false, error: '데이터 업데이트에 실패했습니다.' },
      { status: 500 }
    )
  }
} 