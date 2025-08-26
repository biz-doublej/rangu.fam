import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Import from sessions route (in production, use shared storage)
const gameSessions = new Map<string, any>()

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId
    const session = gameSessions.get(sessionId)
    
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

export async function PUT(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId
    const body = await request.json()
    const { playerId, action, gameState } = body
    
    const session = gameSessions.get(sessionId)
    
    if (!session) {
      return NextResponse.json({ error: 'Game session not found' }, { status: 404 })
    }
    
    const playerIndex = session.players.findIndex((p: any) => p.id === playerId)
    
    if (playerIndex === -1) {
      return NextResponse.json({ error: 'Player not found in session' }, { status: 404 })
    }
    
    // Handle different actions
    switch (action) {
      case 'ready':
        session.players[playerIndex].isReady = true
        break
        
      case 'unready':
        session.players[playerIndex].isReady = false
        break
        
      case 'updateGameState':
        session.players[playerIndex].gameState = gameState
        break
        
      case 'startGame':
        if (session.players[playerIndex].isHost) {
          session.gameStatus = 'playing'
        }
        break
        
      case 'endGame':
        session.gameStatus = 'finished'
        break
        
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    
    gameSessions.set(sessionId, session)
    
    return NextResponse.json({
      success: true,
      session
    })
  } catch (error) {
    console.error('Error updating game session:', error)
    return NextResponse.json({ error: 'Failed to update game session' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  try {
    const sessionId = params.sessionId
    const url = new URL(request.url)
    const playerId = url.searchParams.get('playerId')
    
    const session = gameSessions.get(sessionId)
    
    if (!session) {
      return NextResponse.json({ error: 'Game session not found' }, { status: 404 })
    }
    
    if (!playerId) {
      // Delete entire session
      gameSessions.delete(sessionId)
      return NextResponse.json({ success: true, message: 'Session deleted' })
    }
    
    // Remove player from session
    session.players = session.players.filter((p: any) => p.id !== playerId)
    
    // If host left, assign new host or delete session
    if (session.players.length === 0) {
      gameSessions.delete(sessionId)
      return NextResponse.json({ success: true, message: 'Session deleted' })
    } else {
      // Assign new host if current host left
      if (!session.players.some((p: any) => p.isHost)) {
        session.players[0].isHost = true
      }
      
      gameSessions.set(sessionId, session)
      return NextResponse.json({
        success: true,
        session,
        message: 'Player removed from session'
      })
    }
  } catch (error) {
    console.error('Error deleting from game session:', error)
    return NextResponse.json({ error: 'Failed to delete from game session' }, { status: 500 })
  }
}