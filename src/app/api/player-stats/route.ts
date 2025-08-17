import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { GameScore, GameStats } from '@/models/Game'
export const dynamic = 'force-dynamic'

// GET - 플레이어 통계 조회
export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    const { searchParams } = new URL(request.url)
    const playerId = searchParams.get('playerId')
    const gameType = searchParams.get('gameType') // 특정 게임 통계
    
    if (!playerId) {
      return NextResponse.json(
        { success: false, error: 'Player ID is required' },
        { status: 400 }
      )
    }
    
    let response: any = {
      playerId
    }
    
    if (gameType) {
      // 특정 게임 통계
      response = await getPlayerGameStats(playerId, gameType)
    } else {
      // 전체 게임 통계
      response = await getPlayerOverallStats(playerId)
    }
    
    return NextResponse.json({
      success: true,
      ...response
    })
    
  } catch (error) {
    console.error('플레이어 통계 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '플레이어 통계를 불러오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

// 특정 게임 플레이어 통계
async function getPlayerGameStats(playerId: string, gameType: string) {
  // 게임 통계
  const stats = await GameStats.findOne({ playerId, gameType }).lean()
  
  // 최근 기록들
  const recentScores = await GameScore.find({ playerId, gameType })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean()
  
  // 개인 기록
  const personalBests = await GameScore.find({ 
    playerId, 
    gameType, 
    isPersonalBest: true 
  })
    .sort({ score: -1 })
    .limit(5)
    .lean()
  
  // 플레이어 순위 계산
  const playerRank = await calculatePlayerRank(playerId, gameType)
  
  // 월별 진행 상황
  const monthlyProgress = await getMonthlyProgress(playerId, gameType)
  
  return {
    playerId,
    gameType,
    stats,
    recentScores,
    personalBests,
    rank: playerRank,
    monthlyProgress
  }
}

// 전체 게임 플레이어 통계
async function getPlayerOverallStats(playerId: string) {
  // 모든 게임 통계
  const allGameStats = await GameStats.find({ playerId }).lean()
  
  // 전체 통합 통계 계산
  const overallStats = allGameStats.reduce((acc, stat) => {
    acc.totalGames += stat.totalGames
    acc.totalScore += stat.totalScore
    acc.totalTime += stat.totalTime
    acc.totalWins += stat.wins
    acc.totalLosses += stat.losses
    acc.totalExperience += stat.experience
    acc.maxLevel = Math.max(acc.maxLevel, stat.level)
    acc.bestScore = Math.max(acc.bestScore, stat.bestScore)
    acc.bestStreak = Math.max(acc.bestStreak, stat.bestStreak)
    return acc
  }, {
    totalGames: 0,
    totalScore: 0,
    totalTime: 0,
    totalWins: 0,
    totalLosses: 0,
    totalExperience: 0,
    maxLevel: 0,
    bestScore: 0,
    bestStreak: 0,
    winRate: 0,
    averageScore: 0
  })
  
  // 승률 계산
  overallStats.winRate = overallStats.totalGames > 0 
    ? Math.round((overallStats.totalWins / overallStats.totalGames) * 100)
    : 0
  
  // 평균 점수 계산
  overallStats.averageScore = overallStats.totalGames > 0
    ? Math.round(overallStats.totalScore / overallStats.totalGames)
    : 0
  
  // 게임별 최고 기록
  const gameRecords = await Promise.all([
    GameScore.findOne({ playerId, gameType: 'tetris' }).sort({ score: -1 }).lean(),
    GameScore.findOne({ playerId, gameType: 'wordchain' }).sort({ score: -1 }).lean(),
    GameScore.findOne({ playerId, gameType: 'cardgame' }).sort({ score: -1 }).lean()
  ])
  
  // 최근 활동
  const recentActivity = await GameScore.find({ playerId })
    .sort({ createdAt: -1 })
    .limit(15)
    .lean()
  
  // 업적 (모든 게임에서)
  const achievements = allGameStats.reduce((acc: any[], stat) => {
    acc.push(...stat.achievements)
    return acc
  }, [])
  
  // 전체 순위 (총 점수 기준)
  const globalRank = await GameStats.aggregate([
    {
      $group: {
        _id: '$playerId',
        totalScore: { $sum: '$totalScore' },
        totalLevel: { $sum: '$level' }
      }
    },
    { $sort: { totalScore: -1 } }
  ])
  
  const playerGlobalRank = globalRank.findIndex(player => player._id === playerId) + 1
  
  return {
    playerId,
    overallStats,
    gameStats: allGameStats,
    gameRecords: {
      tetris: gameRecords[0],
      wordchain: gameRecords[1],
      cardgame: gameRecords[2]
    },
    recentActivity,
    achievements,
    globalRank: playerGlobalRank,
    totalPlayers: globalRank.length
  }
}

// 플레이어 순위 계산
async function calculatePlayerRank(playerId: string, gameType: string) {
  const playerStats = await GameStats.findOne({ playerId, gameType }).lean() as any
  
  if (!playerStats) {
    return { rank: 0, totalPlayers: 0 }
  }
  
  const betterPlayers = await GameStats.countDocuments({
    gameType,
    bestScore: { $gt: playerStats.bestScore }
  })
  
  const totalPlayers = await GameStats.countDocuments({ gameType })
  
  return {
    rank: betterPlayers + 1,
    totalPlayers,
    percentile: totalPlayers > 0 ? Math.round(((totalPlayers - betterPlayers) / totalPlayers) * 100) : 0
  }
}

// 월별 진행 상황
async function getMonthlyProgress(playerId: string, gameType: string) {
  const stats = await GameStats.findOne({ playerId, gameType }).lean() as any
  
  if (!stats || !stats.monthlyStats) {
    return []
  }
  
  // 최근 12개월 데이터 정렬
  return stats.monthlyStats
    .sort((a: any, b: any) => {
      if (a.year !== b.year) return b.year - a.year
      return b.month - a.month
    })
    .slice(0, 12)
    .reverse() // 오래된 것부터 표시
}

// POST - 플레이어 통계 초기화 (관리자용)
export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const { playerId, gameType } = await request.json()
    
    if (!playerId || !gameType) {
      return NextResponse.json(
        { success: false, error: 'Player ID and game type are required' },
        { status: 400 }
      )
    }
    
    // 통계 초기화
    await GameStats.findOneAndUpdate(
      { playerId, gameType },
      {
        totalGames: 0,
        totalScore: 0,
        totalTime: 0,
        averageScore: 0,
        bestScore: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        winRate: 0,
        currentStreak: 0,
        bestStreak: 0,
        level: 1,
        experience: 0,
        rank: 'Bronze',
        monthlyStats: [],
        achievements: []
      },
      { upsert: true }
    )
    
    return NextResponse.json({
      success: true,
      message: '플레이어 통계가 초기화되었습니다.'
    })
    
  } catch (error) {
    console.error('플레이어 통계 초기화 오류:', error)
    return NextResponse.json(
      { success: false, error: '플레이어 통계 초기화에 실패했습니다.' },
      { status: 500 }
    )
  }
} 