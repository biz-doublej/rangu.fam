import { MemberActivity, ActivityUpdate } from '@/backend/types'
import { formatDate } from '@/lib/utils'

export class ActivityService {
  private static activities: Record<string, MemberActivity> = {
    jaewon: {
      memberId: 'jaewon',
      lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2시간 전
      lastSeen: new Date(Date.now() - 10 * 60 * 1000), // 10분 전
      isOnline: true,
      currentActivity: '코딩 중',
      sessionDuration: 18900
    },
    minseok: {
      memberId: 'minseok',
      lastLogin: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1일 전
      lastSeen: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8시간 전
      isOnline: false,
      currentActivity: '스위스 여행 중',
      sessionDuration: 28500
    },
    jinkyu: {
      memberId: 'jinkyu',
      lastLogin: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3일 전
      lastSeen: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2일 전
      isOnline: false,
      currentActivity: '군 복무 중',
      sessionDuration: 2700
    },
    hanul: {
      memberId: 'hanul',
      lastLogin: new Date(Date.now() - 30 * 60 * 1000), // 30분 전
      lastSeen: new Date(Date.now() - 5 * 60 * 1000), // 5분 전
      isOnline: true,
      currentActivity: '게임 중',
      sessionDuration: 11100
    }
  }

  static async getMemberActivity(memberId: string): Promise<MemberActivity> {
    const activity = this.activities[memberId]
    
    if (!activity) {
      // 기본 활동 상태 생성
      const defaultActivity: MemberActivity = {
        memberId,
        lastLogin: null,
        lastSeen: new Date(),
        isOnline: false,
        currentActivity: '오프라인',
        sessionDuration: 0
      }
      this.activities[memberId] = defaultActivity
      return defaultActivity
    }

    // 온라인 상태 체크 (수동으로 설정된 상태를 우선적으로 사용)
    // 실제로는 웹소켓이나 하트비트를 통해 실시간으로 관리되어야 함
    const now = new Date()
    const timeDiff = now.getTime() - activity.lastSeen.getTime()
    const minutesAgo = Math.floor(timeDiff / (1000 * 60))
    
    // 60분 이상 비활성시에만 강제로 오프라인 처리
    if (minutesAgo >= 60 && activity.isOnline) {
      activity.isOnline = false
      activity.currentActivity = this.getLastSeenText(activity.lastSeen)
    }

    return activity
  }

  static async updateMemberActivity(memberId: string, update: ActivityUpdate & { action?: 'login' | 'logout' }): Promise<void> {
    const currentActivity = this.activities[memberId] || {
      memberId,
      lastLogin: null,
      lastSeen: new Date(),
      isOnline: false,
      currentActivity: '오프라인',
      sessionDuration: 0
    }

    const now = new Date()
    
    // 액션에 따른 시간 업데이트
    if (update.action === 'login') {
      // 로그인: 무조건 lastLogin을 현재 시간으로 업데이트
      currentActivity.lastLogin = now
      currentActivity.isOnline = true
      currentActivity.lastSeen = now
    } else if (update.action === 'logout') {
      // 로그아웃: 오프라인 상태로 변경하고 lastSeen 업데이트
      currentActivity.isOnline = false
      currentActivity.lastSeen = now
    } else {
      // 일반적인 활동 업데이트
      if (!currentActivity.isOnline && update.isOnline) {
        currentActivity.lastLogin = now
      }
      currentActivity.lastSeen = now
    }

    this.activities[memberId] = {
      ...currentActivity,
      ...update,
      lastSeen: now
    }
  }

  static async getAllActivities(): Promise<Record<string, MemberActivity>> {
    return this.activities
  }

  private static getLastSeenText(lastSeen: Date): string {
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return '방금 전 활동'
    if (diffInMinutes < 60) return `${diffInMinutes}분 전 활동`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}시간 전 활동`
    
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}일 전 활동`
    
    return formatDate.relative(lastSeen)
  }

  static getActivityStatus(activity: MemberActivity): {
    status: 'online' | 'away' | 'offline'
    text: string
    color: string
  } {
    if (activity.isOnline) {
      return {
        status: 'online',
        text: activity.currentActivity,
        color: 'text-green-500'
      }
    }

    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - activity.lastSeen.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 30) {
      return {
        status: 'away',
        text: '잠시 자리비움',
        color: 'text-yellow-500'
      }
    }

    return {
      status: 'offline',
      text: this.getLastSeenText(activity.lastSeen),
      color: 'text-gray-500'
    }
  }
} 