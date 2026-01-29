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
}
