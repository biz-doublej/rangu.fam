import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import dbConnect from '@/lib/mongodb'
import { GameScore, GameStats } from '@/models/Game'
export const dynamic = 'force-dynamic'

// GET - 게임 점수 조회
export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    const { searchParams } = new URL(request.url)
    const gameType = searchParams.get('gameType')
    const playerId = searchParams.get('playerId')
    const limit = parseInt(searchParams.get('limit') || '10')
    const sortBy = searchParams.get('sortBy') || 'score' // 'score', 'date', 'duration'
    const order = searchParams.get('order') || 'desc'
    
    let query: any = {}
    
    if (gameType) {
      query.gameType = gameType
    }
    
    if (playerId) {
      query.playerId = playerId
    }
    
    // 정렬 옵션 설정
    let sortOptions: any = {}
    switch (sortBy) {
      case 'score':
        sortOptions.score = order === 'desc' ? -1 : 1
        break
      case 'date':
        sortOptions.createdAt = order === 'desc' ? -1 : 1
        break
      case 'duration':
        sortOptions.duration = order === 'desc' ? -1 : 1
        break
      default:
        sortOptions.score = -1
    }
    
    const scores = await GameScore
      .find(query)
      .sort(sortOptions)
      .limit(limit)
      .lean()
    
    return NextResponse.json({
      success: true,
      scores
    })
    
  } catch (error) {
    console.error('게임 점수 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '게임 점수를 불러오는데 실패했습니다.' },
      { status: 500 }
    )
  }
}

// POST - 새 게임 점수 추가
export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const body = await request.json()
    const {
      playerId,
      playerName,
      userId,
      gameType,
      score,
      level,
      duration,
      moves,
      accuracy,
      combo,
      difficulty,
      gameData,
      screenshot,
      replay,
      tags
    } = body
    
    // 필수 필드 검증
    if (!playerId || !playerName || !gameType || score === undefined || !duration) {
      return NextResponse.json(
        { success: false, error: '필수 필드가 누락되었습니다.' },
        { status: 400 }
      )
    }
    
    // 기존 최고 점수 확인
    const existingBest = await GameScore
      .findOne({ playerId, gameType })
      .sort({ score: -1 })
      .lean() as any
    
    const isPersonalBest = !existingBest || score > existingBest.score
    const isNewRecord = await checkIfNewRecord(gameType, score)
    
    // 새 점수 생성
    const scoreData: any = {
      playerId,
      playerName,
      gameType,
      score,
      level: level || 1,
      duration,
      moves,
      accuracy,
      combo,
      difficulty: difficulty || 'normal',
      gameData: gameData || {},
      isPersonalBest,
      isNewRecord,
      screenshot,
      replay,
      tags: tags || [],
      likes: 0,
      likedBy: [],
      comments: []
    }
    
    // userId가 유효한 ObjectId인 경우에만 추가
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      scoreData.userId = userId
    }
    
    const newScore = new GameScore(scoreData)
    const savedScore = await newScore.save()
    
    // 통계 업데이트
    await updatePlayerStats(playerId, gameType, {
      score,
      duration,
      isWin: true // 게임 완료로 간주
    })
    
    return NextResponse.json({
      success: true,
      score: savedScore,
      isPersonalBest,
      isNewRecord
    })
    
  } catch (error) {
    console.error('게임 점수 추가 오류:', error)
    return NextResponse.json(
      { success: false, error: '게임 점수 저장에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// PUT - 게임 점수 업데이트 (좋아요, 댓글 등)
export async function PUT(request: NextRequest) {
  try {
    await dbConnect()
    
    const body = await request.json()
    const { scoreId, action, userId, username, comment } = body
    
    const score = await GameScore.findById(scoreId)
    
    if (!score) {
      return NextResponse.json(
        { success: false, error: '게임 점수를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }
    
    switch (action) {
      case 'like':
        if (!score.likedBy.includes(userId)) {
          score.likes += 1
          score.likedBy.push(userId)
        } else {
          score.likes -= 1
          score.likedBy = score.likedBy.filter((id: any) => id.toString() !== userId)
        }
        break
        
      case 'comment':
        if (!comment) {
          return NextResponse.json(
            { success: false, error: '댓글 내용이 필요합니다.' },
            { status: 400 }
          )
        }
        score.comments.push({
          userId,
          username,
          content: comment,
          createdAt: new Date()
        })
        break
        
      default:
        return NextResponse.json(
          { success: false, error: '지원하지 않는 액션입니다.' },
          { status: 400 }
        )
    }
    
    await score.save()
    
    return NextResponse.json({
      success: true,
      score
    })
    
  } catch (error) {
    console.error('게임 점수 업데이트 오류:', error)
    return NextResponse.json(
      { success: false, error: '게임 점수 업데이트에 실패했습니다.' },
      { status: 500 }
    )
  }
}

// 새로운 기록인지 확인하는 함수
async function checkIfNewRecord(gameType: string, score: number): Promise<boolean> {
  const currentRecord = await GameScore
    .findOne({ gameType })
    .sort({ score: -1 })
    .lean() as any
  
  return !currentRecord || score > currentRecord.score
}

// 플레이어 통계 업데이트 함수
async function updatePlayerStats(playerId: string, gameType: string, gameResult: {
  score: number
  duration: number
  isWin: boolean
}) {
  try {
    let stats = await GameStats.findOne({ playerId, gameType })
    
    if (!stats) {
      // 새 통계 생성
      stats = new GameStats({
        playerId,
        gameType,
        totalGames: 0,
        totalScore: 0,
        totalTime: 0,
        averageScore: 0,
        bestScore: 0,
        wins: 0,
        losses: 0,
        winRate: 0,
        currentStreak: 0,
        bestStreak: 0,
        level: 1,
        experience: 0,
        rank: 'Bronze',
        monthlyStats: []
      })
    }
    
    // 통계 업데이트
    stats.totalGames += 1
    stats.totalScore += gameResult.score
    stats.totalTime += gameResult.duration
    stats.averageScore = Math.round(stats.totalScore / stats.totalGames)
    
    if (gameResult.score > stats.bestScore) {
      stats.bestScore = gameResult.score
      stats.bestScoreDate = new Date()
    }
    
    if (gameResult.isWin) {
      stats.wins += 1
      stats.currentStreak += 1
      if (stats.currentStreak > stats.bestStreak) {
        stats.bestStreak = stats.currentStreak
      }
    } else {
      stats.losses += 1
      stats.currentStreak = 0
    }
    
    stats.winRate = Math.round((stats.wins / stats.totalGames) * 100)
    
    // 경험치 및 레벨 업데이트
    const expGained = Math.floor(gameResult.score / 100) + (gameResult.isWin ? 50 : 20)
    stats.experience += expGained
    
    const newLevel = Math.floor(stats.experience / 1000) + 1
    if (newLevel > stats.level) {
      stats.level = newLevel
    }
    
    // 랭크 업데이트
    if (stats.level >= 50) stats.rank = 'Diamond'
    else if (stats.level >= 30) stats.rank = 'Platinum'
    else if (stats.level >= 20) stats.rank = 'Gold'
    else if (stats.level >= 10) stats.rank = 'Silver'
    else stats.rank = 'Bronze'
    
    // 월별 통계 업데이트
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1
    
    let monthlystat = stats.monthlyStats.find(
      (stat: any) => stat.year === currentYear && stat.month === currentMonth
    )
    
    if (!monthlystat) {
      monthlystat = {
        year: currentYear,
        month: currentMonth,
        games: 0,
        score: 0,
        time: 0,
        bestScore: 0
      }
      stats.monthlyStats.push(monthlystat)
    }
    
    monthlystat.games += 1
    monthlystat.score += gameResult.score
    monthlystat.time += gameResult.duration
    if (gameResult.score > monthlystat.bestScore) {
      monthlystat.bestScore = gameResult.score
    }
    
    await stats.save()
    
  } catch (error) {
    console.error('플레이어 통계 업데이트 오류:', error)
    // 통계 업데이트 실패해도 점수 저장은 계속 진행
  }
} 