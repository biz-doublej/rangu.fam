import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { WikiUser, WikiSubmission } from '@/models/Wiki'
import { User } from '@/models/User'
import { Track } from '@/models/Track'
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
    const user = await WikiUser.findById(decoded.userId)
    
    if (!user || (user.role !== 'admin' && user.role !== 'moderator' && user.role !== 'owner')) {
      return null
    }
    
    return user
  } catch (error) {
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

    // 사용자 통계
    const userStats = {
      total: wikiUsers.length,
      active: wikiUsers.filter(u => u.isActive).length,
      banned: wikiUsers.filter(u => u.banStatus?.isBanned).length,
      newToday: wikiUsers.filter(u => 
        new Date(u.createdAt) >= today
      ).length
    }

    // 위키 통계
    const wikiStats = {
      totalPages: wikiSubmissions.length,
      pending: wikiSubmissions.filter(s => s.status === 'pending').length,
      approved: wikiSubmissions.filter(s => s.status === 'approved').length,
      rejected: wikiSubmissions.filter(s => s.status === 'rejected').length,
      onhold: wikiSubmissions.filter(s => s.status === 'onhold').length
    }

    // 게임 통계
    const gameStats = {
      totalScores: gameScores.length,
      todayPlayers: new Set(
        gameScores
          .filter(score => new Date(score.createdAt) >= today)
          .map(score => score.playerId)
      ).size,
      topScore: gameScores.length > 0 ? Math.max(...gameScores.map(s => s.score)) : 0
    }

    // 음악 통계
    const musicStats = {
      totalTracks: tracks.length,
      totalPlays: tracks.reduce((sum, track) => sum + (track.playCount || 0), 0),
      uploadsToday: tracks.filter(t => 
        new Date(t.createdAt) >= today
      ).length
    }

    // 카드 통계
    const cardStatsData = {
      totalDrops: cardStats.reduce((sum, stat) => sum + (stat.totalDrops || 0), 0),
      activeCollectors: cardStats.filter(stat => 
        new Date(stat.lastDropDate) >= yesterday
      ).length,
      rareCards: cardStats.reduce((sum, stat) => sum + (stat.rareCardCount || 0), 0)
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
    const recentActivity = await generateRecentActivity(wikiSubmissions, wikiUsers, tracks, gameScores)

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
) {
  const activities = []
  
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
