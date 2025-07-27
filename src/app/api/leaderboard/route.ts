import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { GameScore, GameStats } from '@/models/Game'

// GET - 리더보드 조회
export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    const { searchParams } = new URL(request.url)
    const gameType = searchParams.get('gameType') || 'all'
    const period = searchParams.get('period') || 'all'
    const category = searchParams.get('category') || 'score'
    const limit = parseInt(searchParams.get('limit') || '20')
    
    let response: any = {}
    
    if (gameType === 'all') {
      response = await getAllGamesLeaderboard(period, category, limit)
    } else {
      response = await getGameLeaderboard(gameType, period, category, limit)
    }
    
    const jsonResponse = NextResponse.json({
      success: true,
      ...response
    })
    
    jsonResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    jsonResponse.headers.set('Pragma', 'no-cache')
    jsonResponse.headers.set('Expires', '0')
    
    return jsonResponse
    
  } catch (error) {
    console.error('리더보드 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '리더보드를 불러오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

// 전체 게임 통합 리더보드
async function getAllGamesLeaderboard(period: string, category: string, limit: number) {
  try {
    const dateFilter = getDateFilter(period)
    
    // 각 게임별 TOP 점수들 (간단한 방식)
    const [tetrisTop, wordchainTop, cardgameTop] = await Promise.all([
      getTopScores('tetris', dateFilter, 5),
      getTopScores('wordchain', dateFilter, 5),
      getTopScores('cardgame', dateFilter, 5)
    ])
    
    // 전체 통합 순위 (모든 게임에서 최고 점수)
    const allScores = await GameScore.aggregate([
      { $match: { ...dateFilter } },
      { $sort: { score: -1 } },
      { $group: {
          _id: '$playerId',
          playerName: { $first: '$playerName' },
          score: { $max: '$score' },
          gameType: { $first: '$gameType' },
          level: { $first: '$level' },
          duration: { $first: '$duration' },
          createdAt: { $first: '$createdAt' }
        }
      },
      { $sort: { score: -1 } },
      { $limit: limit },
      { $addFields: {
          playerId: '$_id',
          scoreValue: '$score'
        }
      }
    ])
    
    // 순위 추가
    const rankedOverall = allScores.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }))
    
    return {
      gameSpecific: {
        tetris: tetrisTop,
        wordchain: wordchainTop,
        cardgame: cardgameTop
      },
      overall: rankedOverall,
      period,
      category
    }
  } catch (error) {
    console.error('getAllGamesLeaderboard 오류:', error)
    return {
      gameSpecific: { tetris: [], wordchain: [], cardgame: [] },
      overall: [],
      period,
      category
    }
  }
}

// 게임별 TOP 점수 가져오기 (헬퍼 함수)
async function getTopScores(gameType: string, dateFilter: any, limit: number) {
  return await GameScore.aggregate([
    { $match: { gameType, ...dateFilter } },
    { $sort: { score: -1 } },
    { $group: {
        _id: '$playerId',
        playerName: { $first: '$playerName' },
        score: { $first: '$score' },
        level: { $first: '$level' },
        duration: { $first: '$duration' },
        createdAt: { $first: '$createdAt' }
      }
    },
    { $sort: { score: -1 } },
    { $limit: limit },
    { $addFields: {
        playerId: '$_id',
        scoreValue: '$score'
      }
    },
    { $addFields: {
        rank: { $add: [{ $indexOfArray: [{ $map: { input: { $range: [0, limit] }, as: 'idx', in: '$$idx' } }, { $subtract: [{ $size: { $range: [0, limit] } }, 1] }] }, 1] }
      }
    }
  ])
}

// 특정 게임 리더보드
async function getGameLeaderboard(gameType: string, period: string, category: string, limit: number) {
  try {
    const dateFilter = getDateFilter(period)
    
    const leaderboard = await GameScore.aggregate([
      { $match: { gameType, ...dateFilter } },
      { $sort: { score: -1 } },
      { $group: {
          _id: '$playerId',
          playerName: { $first: '$playerName' },
          score: { $first: '$score' },
          level: { $first: '$level' },
          duration: { $first: '$duration' },
          createdAt: { $first: '$createdAt' },
          gameData: { $first: '$gameData' },
          isPersonalBest: { $first: '$isPersonalBest' },
          isNewRecord: { $first: '$isNewRecord' }
        }
      },
      { $sort: { score: -1 } },
      { $limit: limit },
      { $addFields: {
          playerId: '$_id',
          scoreValue: '$score'
        }
      }
    ])
    
    // 순위 추가
    const rankedLeaderboard = leaderboard.map((entry, index) => ({
      ...entry,
      rank: index + 1
    }))
    
    const gameStats = await getGameStatistics(gameType, period)
    
    return {
      leaderboard: rankedLeaderboard,
      gameType,
      period,
      category,
      statistics: gameStats
    }
  } catch (error) {
    console.error('getGameLeaderboard 오류:', error)
    return {
      leaderboard: [],
      gameType,
      period,
      category,
      statistics: null
    }
  }
}

// 날짜 필터 생성
function getDateFilter(period: string) {
  const now = new Date()
  let startDate: Date
  
  switch (period) {
    case 'weekly':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'yearly':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    default:
      return {}
  }
  
  return {
    createdAt: { $gte: startDate }
  }
}

// 게임별 추가 통계
async function getGameStatistics(gameType: string, period: string) {
  try {
    const dateFilter = getDateFilter(period)
    const filter = gameType === 'all' ? dateFilter : { gameType, ...dateFilter }
    
    const [
      totalPlayers,
      totalGames,
      averageScore,
      highestScore,
      totalPlayTime
    ] = await Promise.all([
      GameScore.distinct('playerId', filter).then(players => players.length),
      GameScore.countDocuments(filter),
      GameScore.aggregate([
        { $match: filter },
        { $group: { _id: null, avg: { $avg: '$score' } } }
      ]).then(result => Math.round(result[0]?.avg || 0)),
      GameScore.findOne(filter).sort({ score: -1 }).select('score playerName'),
      GameScore.aggregate([
        { $match: filter },
        { $group: { _id: null, total: { $sum: '$duration' } } }
      ]).then(result => Math.round((result[0]?.total || 0) / 60))
    ])
    
    return {
      totalPlayers,
      totalGames,
      averageScore,
      highestScore: highestScore || { score: 0, playerName: 'None' },
      totalPlayTime
    }
  } catch (error) {
    console.error('게임 통계 조회 오류:', error)
    return {
      totalPlayers: 0,
      totalGames: 0,
      averageScore: 0,
      highestScore: { score: 0, playerName: 'None' },
      totalPlayTime: 0
    }
  }
} 