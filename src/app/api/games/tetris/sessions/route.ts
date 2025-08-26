import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

// In-memory storage for game sessions (in production, use Redis or database)
const gameSessions = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { hostId, hostName } = body
    
    if (!hostId || !hostName) {
      return NextResponse.json({ error: 'Host ID and name are required' }, { status: 400 })
    }
    
    // Generate unique game ID
    const gameId = `tetris_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Create game session
    const gameSession = {
      gameId,
      hostId,
      players: [
        {
          id: hostId,
          username: hostName,
          isHost: true,
          isReady: false,
          isBot: false,
          gameState: null
        }
      ],
      gameStatus: 'waiting',
      createdAt: Date.now()
    }
    
    gameSessions.set(gameId, gameSession)
    
    // Generate invite link
    const inviteLink = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/games/tetris?invite=${gameId}`
    
    return NextResponse.json({
      success: true,
      session: gameSession,
      inviteLink
    })
  } catch (error) {
    console.error('Error creating game session:', error)
    return NextResponse.json({ error: 'Failed to create game session' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const gameId = url.searchParams.get('gameId')
    
    if (!gameId) {
      // Return all active sessions
      const activeSessions = Array.from(gameSessions.values())
        .filter(session => session.gameStatus !== 'finished')
      
      return NextResponse.json({
        success: true,
        sessions: activeSessions
      })
    }
    
    // Return specific session
    const session = gameSessions.get(gameId)
    
    if (!session) {
      return NextResponse.json({ error: 'Game session not found' }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      session
    })
  } catch (error) {
    console.error('Error fetching game session:', error)
    return NextResponse.json({ error: 'Failed to fetch game session' }, { status: 500 })
  }
}