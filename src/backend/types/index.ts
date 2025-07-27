export interface MemberActivity {
  memberId: string
  lastLogin: Date | null
  lastSeen: Date
  isOnline: boolean
  currentActivity: string
  sessionDuration?: number
}

export interface MemberWithActivity {
  id: string
  name: string
  role: string
  description: string
  avatar?: string
  email?: string
  status: 'active' | 'inactive'
  location?: string
  joinDate: Date
  personalPageUrl?: string
  // Activity fields
  lastLogin: Date | null
  lastSeen: Date
  isOnline: boolean
  currentActivity: string
}

export interface ActivityUpdate {
  lastSeen: Date
  isOnline: boolean
  currentActivity: string
  action?: 'login' | 'logout'
}

export interface ActivityLog {
  id: string
  memberId: string
  action: 'login' | 'logout' | 'page_visit' | 'activity_update'
  timestamp: Date
  details?: string
} 