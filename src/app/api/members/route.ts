import { NextRequest, NextResponse } from 'next/server'
import { MemberService } from '@/backend/services/memberService'
import { ActivityService } from '@/backend/services/activityService'
import { Member } from '@/types'
import { MemberActivity } from '@/backend/types'
export const dynamic = 'force-dynamic'

// 상태 시스템에서 상태 정보 가져오기
async function getUserStatus(userId: string) {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/profiles/${userId}/status`)
    if (response.ok) {
      return await response.json()
    }
  } catch (error) {
    console.log(`${userId} 상태 조회 실패:`, error)
  }
  return null
}

export async function GET(request: NextRequest) {
  try {
    const members = await MemberService.getAllMembers()
    
    const membersWithActivity = await Promise.all(
      members.map(async (member: Member) => {
        const activity = await ActivityService.getMemberActivity(member.id)
        const statusData = await getUserStatus(member.id)
        
        // 로그인 상태 확인 (최근 활동 기준)
        const now = new Date()
        const lastSeenTime = new Date(activity.lastSeen)
        const timeDiffMinutes = (now.getTime() - lastSeenTime.getTime()) / (1000 * 60)
        
        // 30분 이내 활동이 있으면 로그인 상태로 간주, 아니면 로그아웃 상태
        const isLoggedIn = timeDiffMinutes < 30
        
        // 상태 결정 로직
        let userStatus: string
        let isOnline: boolean
        let currentActivity: string
        
        if (!isLoggedIn) {
          // 로그아웃 상태면 무조건 오프라인
          userStatus = 'offline'
          isOnline = false
          currentActivity = statusData?.customMessage || '오프라인'
        } else {
          // 로그인 상태면 설정된 상태 사용, 없으면 오프라인 (기본값)
          userStatus = statusData ? statusData.status : 'offline'
          isOnline = userStatus !== 'offline'
          currentActivity = statusData ? statusData.customMessage : activity.currentActivity
        }
        
        return {
          ...member,
          lastLogin: activity.lastLogin,
          isOnline,
          currentActivity,
          userStatus,
          lastSeen: activity.lastSeen
        }
      })
    )
    
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
      
      return NextResponse.json({ success: true })
    }
    
    if (action === 'logout') {
      await ActivityService.updateMemberActivity(memberId, {
        lastSeen: new Date(),
        isOnline: false,
        currentActivity: body.activity || '오프라인',
        action: 'logout'
      })
      
      return NextResponse.json({ success: true })
    }
    
    if (action === 'updateActivity') {
      const isOffline = body.activity === '오프라인'
      
      await ActivityService.updateMemberActivity(memberId, {
        lastSeen: new Date(),
        isOnline: !isOffline,
        currentActivity: body.activity || '온라인'
      })
      
      return NextResponse.json({ success: true })
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating member activity:', error)
    return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 })
  }
} 
