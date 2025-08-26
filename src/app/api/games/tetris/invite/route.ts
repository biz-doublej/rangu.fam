import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'

export const dynamic = 'force-dynamic'

// In-memory storage for invitations (in production, use database)
const gameInvitations = new Map<string, any>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { gameId, hostId, invitedMemberId } = body
    
    if (!gameId || !hostId || !invitedMemberId) {
      return NextResponse.json(
        { error: 'Game ID, host ID, and invited member ID are required' }, 
        { status: 400 }
      )
    }
    
    // Check if member exists and is one of the 6 rangu.fam members
    const validMembers = ['member1', 'member2', 'member3', 'member4', 'member5', 'member6']
    
    if (!validMembers.includes(invitedMemberId)) {
      return NextResponse.json(
        { error: 'Can only invite registered rangu.fam members' }, 
        { status: 400 }
      )
    }
    
    // Create invitation
    const invitationId = `invite_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const invitation = {
      id: invitationId,
      gameId,
      hostId,
      invitedMemberId,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + (30 * 60 * 1000) // 30 minutes from now
    }
    
    gameInvitations.set(invitationId, invitation)
    
    // In a real application, you would:
    // 1. Send real-time notification to the invited member
    // 2. Send Discord notification
    // 3. Store in database
    
    console.log(`Game invitation sent: ${hostId} invited ${invitedMemberId} to game ${gameId}`)
    
    return NextResponse.json({
      success: true,
      invitation,
      message: 'Invitation sent successfully'
    })
  } catch (error) {
    console.error('Error sending game invitation:', error)
    return NextResponse.json({ error: 'Failed to send invitation' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const memberId = url.searchParams.get('memberId')
    
    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 })
    }
    
    // Get pending invitations for this member
    const pendingInvitations = Array.from(gameInvitations.values())
      .filter(invitation => 
        invitation.invitedMemberId === memberId && 
        invitation.status === 'pending' &&
        invitation.expiresAt > Date.now()
      )
    
    return NextResponse.json({
      success: true,
      invitations: pendingInvitations
    })
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { invitationId, action, memberId } = body
    
    if (!invitationId || !action || !memberId) {
      return NextResponse.json(
        { error: 'Invitation ID, action, and member ID are required' }, 
        { status: 400 }
      )
    }
    
    const invitation = gameInvitations.get(invitationId)
    
    if (!invitation) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 })
    }
    
    if (invitation.invitedMemberId !== memberId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    if (invitation.expiresAt <= Date.now()) {
      invitation.status = 'expired'
      gameInvitations.set(invitationId, invitation)
      return NextResponse.json({ error: 'Invitation has expired' }, { status: 400 })
    }
    
    // Handle accept/decline
    if (action === 'accept') {
      invitation.status = 'accepted'
      // In real app: add member to game session
      console.log(`Invitation accepted: ${memberId} joined game ${invitation.gameId}`)
    } else if (action === 'decline') {
      invitation.status = 'declined'
      console.log(`Invitation declined: ${memberId} declined game ${invitation.gameId}`)
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
    
    gameInvitations.set(invitationId, invitation)
    
    return NextResponse.json({
      success: true,
      invitation,
      message: `Invitation ${action}ed successfully`
    })
  } catch (error) {
    console.error('Error responding to invitation:', error)
    return NextResponse.json({ error: 'Failed to respond to invitation' }, { status: 500 })
  }
}