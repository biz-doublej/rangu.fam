import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { WikiUser, WikiSubmission } from '@/models/Wiki'
import User, { IUser } from '@/models/User'
import Track, { ITrack } from '@/models/Track'
import { GameScore } from '@/models/Game'
import { UserCardStats } from '@/models/UserCardStats'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.JWT_SECRET || 'rangu-wiki-secret'

async function verifyAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  try {
    const token = authHeader.substring(7)
    const decoded = jwt.verify(token, JWT_SECRET) as any
    
    await dbConnect()
    
    let user
    if (decoded.userId) {
      // Admin JWT 토큰 형식
      user = await WikiUser.findById(decoded.userId)
    } else if (decoded.username) {
      // Wiki JWT 토큰 형식
      user = await WikiUser.findOne({ username: decoded.username })
    }
    
    if (!user || (user.role !== 'admin' && user.role !== 'moderator' && user.role !== 'owner')) {
      return null
    }
    
    return user
  } catch (error) {
    // JWT 검증 실패 시 null 반환
    return null
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdmin(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '관리자 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    await dbConnect()

    // 현재 시간 계산
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)

    // 병렬로 데이터 수집
    const [
      wikiUsers,
      regularUsers,
      wikiSubmissions,
      tracks,
      gameScores,
      cardStats
    ] = await Promise.all([
      WikiUser.find({}).lean(),
      User.find({}).lean(),
      WikiSubmission.find({}).lean(),
      Track.find({}).lean(),
      GameScore.find({}).lean(),
      UserCardStats.find({}).lean()
    ])

    // 타입 캐스팅
    const typedWikiUsers = wikiUsers as any[]
    const typedRegularUsers = regularUsers as any[]
    const typedWikiSubmissions = wikiSubmissions as any[]
    const typedTracks = tracks as any[]
    const typedGameScores = gameScores as any[]
    const typedCardStats = cardStats as any[]

    // 사용자 통계
    const userStats = {
      total: typedWikiUsers.length,
      active: typedWikiUsers.filter((u: any) => u.isActive).length,
      banned: typedWikiUsers.filter((u: any) => u.banStatus?.isBanned).length,
      newToday: typedWikiUsers.filter((u: any) => 
        new Date(u.createdAt) >= today
      ).length
    }

    // 위키 통계
    const wikiStats = {
      totalPages: typedWikiSubmissions.length,
      pending: typedWikiSubmissions.filter((s: any) => s.status === 'pending').length,
      approved: typedWikiSubmissions.filter((s: any) => s.status === 'approved').length,
      rejected: typedWikiSubmissions.filter((s: any) => s.status === 'rejected').length,
      onhold: typedWikiSubmissions.filter((s: any) => s.status === 'onhold').length
    }

    // 게임 통계
    const gameStats = {
      totalScores: typedGameScores.length,
      todayPlayers: new Set(
        typedGameScores
          .filter((score: any) => new Date(score.createdAt) >= today)
          .map((score: any) => score.playerId)
      ).size,
      topScore: typedGameScores.length > 0 ? Math.max(...typedGameScores.map((s: any) => s.score)) : 0
    }

    // 음악 통계
    const musicStats = {
      totalTracks: typedTracks.length,
      totalPlays: typedTracks.reduce((sum: number, track: any) => sum + (track.playCount || track.plays || 0), 0),
      uploadsToday: typedTracks.filter((t: any) => 
        new Date(t.createdAt) >= today
      ).length
    }

    // 카드 통계
    const cardStatsData = {
      totalDrops: typedCardStats.reduce((sum: number, stat: any) => sum + (stat.totalDrops || 0), 0),
      activeCollectors: typedCardStats.filter((stat: any) => 
        new Date(stat.lastDropDate) >= yesterday
      ).length,
      rareCards: typedCardStats.reduce((sum: number, stat: any) => sum + (stat.rareCardCount || 0), 0)
    }

    // 이미지 통계 (임시 데이터)
    const imageStats = {
      totalImages: 150, // 실제 이미지 모델이 있다면 계산
      uploadsToday: 5,
      storageUsed: '2.3 GB'
    }

    // 시스템 통계 (모의 데이터)
    const systemStats = {
      uptime: calculateUptime(),
      responseTime: Math.floor(Math.random() * 50) + 30, // 30-80ms
      activeConnections: Math.floor(Math.random() * 30) + 15, // 15-45
      serverLoad: Math.floor(Math.random() * 30) + 20 // 20-50%
    }

    // 최근 활동 데이터
    const recentActivity = await generateRecentActivity(typedWikiSubmissions, typedWikiUsers, typedTracks, typedGameScores)

    const dashboardStats = {
      users: userStats,
      wiki: wikiStats,
      games: gameStats,
      music: musicStats,
      cards: cardStatsData,
      images: imageStats,
      system: systemStats
    }

    return NextResponse.json({
      success: true,
      stats: dashboardStats,
      recentActivity,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('대시보드 통계 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '통계 데이터를 불러오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

function calculateUptime(): string {
  // 임시 업타임 계산 (실제로는 서버 시작 시간부터 계산해야 함)
  const hours = Math.floor(Math.random() * 72) + 1
  const minutes = Math.floor(Math.random() * 60)
  
  if (hours < 24) {
    return `${hours}h ${minutes}m`
  } else {
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    return `${days}d ${remainingHours}h`
  }
}

async function generateRecentActivity(
  submissions: any[],
  users: any[],
  tracks: any[],
  gameScores: any[]
): Promise<any[]> {
  const activities: any[] = []
  
  // 최근 위키 편집
  const recentSubmissions = submissions
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)
  
  recentSubmissions.forEach(submission => {
    activities.push({
      id: `wiki-${submission._id}`,
      type: submission.type === 'create' ? 'edit' : 'edit',
      user: submission.author,
      action: `${submission.targetTitle} ${submission.type === 'create' ? '페이지 생성' : '편집'}`,
      timestamp: submission.createdAt,
      details: { submissionId: submission._id }
    })
  })

  // 최근 사용자 로그인
  const recentUsers = users
    .filter(u => u.lastLogin)
    .sort((a, b) => new Date(b.lastLogin).getTime() - new Date(a.lastLogin).getTime())
    .slice(0, 2)
  
  recentUsers.forEach(user => {
    activities.push({
      id: `login-${user._id}`,
      type: 'login',
      user: user.username,
      action: '로그인',
      timestamp: user.lastLogin,
      details: { userId: user._id }
    })
  })

  // 최근 음악 업로드
  const recentTracks = tracks
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 2)
  
  recentTracks.forEach(track => {
    activities.push({
      id: `music-${track._id}`,
      type: 'upload',
      user: track.uploadedBy,
      action: `${track.title} 음악 업로드`,
      timestamp: track.createdAt,
      details: { trackId: track._id }
    })
  })

  // 최근 게임 점수
  const recentGameScores = gameScores
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 2)
  
  recentGameScores.forEach(score => {
    activities.push({
      id: `game-${score._id}`,
      type: 'game',
      user: score.playerName,
      action: `${score.gameType} 게임에서 ${score.score}점 기록`,
      timestamp: score.createdAt,
      details: { scoreId: score._id }
    })
  })

  // 시간순 정렬
  return activities
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 10)
}
