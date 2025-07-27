import { NextRequest, NextResponse } from 'next/server'
import { MemberService } from '@/backend/services/memberService'
import { ActivityService } from '@/backend/services/activityService'
import { Member } from '@/types'
import { MemberActivity } from '@/backend/types'

export async function GET(request: NextRequest) {
  try {
    console.log('API: Fetching members...')
    const members = await MemberService.getAllMembers()
    console.log('API: Members found:', members.length)
    
    const membersWithActivity = await Promise.all(
      members.map(async (member: Member) => {
        const activity = await ActivityService.getMemberActivity(member.id)
        console.log(`API: Activity for ${member.name}:`, {
          isOnline: activity.isOnline,
          currentActivity: activity.currentActivity,
          lastSeen: activity.lastSeen
        })
        
        return {
          ...member,
          lastLogin: activity.lastLogin,
          isOnline: activity.isOnline,
          currentActivity: activity.currentActivity,
          lastSeen: activity.lastSeen
        }
      })
    )
    
    console.log('API: Returning members with activity')
    return NextResponse.json(membersWithActivity)
  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { memberId, action } = body
    
    if (action === 'login') {
      await ActivityService.updateMemberActivity(memberId, {
        lastSeen: new Date(),
        isOnline: true,
        currentActivity: body.activity || '온라인',
        action: 'login'
      })
      
      console.log(`API: Member ${memberId} logged in`)
      return NextResponse.json({ success: true })
    }
    
    if (action === 'logout') {
      await ActivityService.updateMemberActivity(memberId, {
        lastSeen: new Date(),
        isOnline: false,
        currentActivity: body.activity || '오프라인',
        action: 'logout'
      })
      
      console.log(`API: Member ${memberId} logged out`)
      return NextResponse.json({ success: true })
    }
    
    if (action === 'updateActivity') {
      const isOffline = body.activity === '오프라인'
      
      await ActivityService.updateMemberActivity(memberId, {
        lastSeen: new Date(),
        isOnline: !isOffline,
        currentActivity: body.activity || '온라인'
      })
      
      console.log(`API: Updated activity for ${memberId}: ${body.activity} (online: ${!isOffline})`)
      return NextResponse.json({ success: true })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating member activity:', error)
    return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 })
  }
} 