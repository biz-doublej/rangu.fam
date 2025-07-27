import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { GameSettings } from '@/models/GameSettings'

// 게임 설정 조회
export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    let settings = await GameSettings.findOne({ userId })
    
    // 설정이 없으면 기본값으로 생성
    if (!settings) {
      settings = new GameSettings({ userId })
      await settings.save()
    }
    
    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('게임 설정 조회 오류:', error)
    return NextResponse.json({ error: 'Failed to fetch game settings' }, { status: 500 })
  }
}

// 게임 설정 저장
export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const { userId, tetrisKeys, botSettings, preferences } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }
    
    const updateData: any = {}
    if (tetrisKeys) updateData.tetrisKeys = tetrisKeys
    if (botSettings) updateData.botSettings = botSettings
    if (preferences) updateData.preferences = preferences
    
    const settings = await GameSettings.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { upsert: true, new: true }
    )
    
    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('게임 설정 저장 오류:', error)
    return NextResponse.json({ error: 'Failed to save game settings' }, { status: 500 })
  }
}

// 특정 게임 설정만 업데이트
export async function PATCH(request: NextRequest) {
  try {
    await dbConnect()
    
    const { userId, gameType, settings } = await request.json()
    
    if (!userId || !gameType || !settings) {
      return NextResponse.json({ 
        error: 'User ID, game type, and settings are required' 
      }, { status: 400 })
    }
    
    const updateData: any = {}
    
    switch (gameType) {
      case 'tetris':
        if (settings.keys) updateData['tetrisKeys'] = settings.keys
        if (settings.bot) updateData['botSettings.tetris'] = settings.bot
        break
      case 'wordchain':
        if (settings.bot) updateData['botSettings.wordchain'] = settings.bot
        break
      case 'cardgame':
        if (settings.bot) updateData['botSettings.cardgame'] = settings.bot
        break
      default:
        return NextResponse.json({ error: 'Invalid game type' }, { status: 400 })
    }
    
    const updatedSettings = await GameSettings.findOneAndUpdate(
      { userId },
      { $set: updateData },
      { upsert: true, new: true }
    )
    
    return NextResponse.json({ success: true, settings: updatedSettings })
  } catch (error) {
    console.error('게임 설정 업데이트 오류:', error)
    return NextResponse.json({ error: 'Failed to update game settings' }, { status: 500 })
  }
} 