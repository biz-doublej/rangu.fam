import { NextResponse } from 'next/server'
import { MemberService } from '@/backend/services/memberService'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const members = await MemberService.getAllMembers()
    return NextResponse.json(members)
  } catch (error) {
    console.error('Error fetching members:', error)
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }
}
