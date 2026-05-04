import { NextRequest, NextResponse } from 'next/server'
import { sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { siteHistory } from '@/db/schema'

export const dynamic = 'force-dynamic'

const DEFAULT_EVENTS = [
  { title: 'Rangu.fam 결성', description: '인스타그램 그룹방이 생성되며 네 친구의 여정이 시작되었습니다.', date: '2023-06-06T11:45:00+09:00', type: 'formation', icon: '🎉', color: 'primary', importance: 5, isPublic: true, isAnniversary: false, relatedMembers: [], images: [], links: [], createdAt: '2023-06-06T11:45:00+09:00', updatedAt: '2023-06-06T11:45:00+09:00' },
  { title: '완전체 구성', description: '정민석이 합류하며 Rangu.fam이 완전체가 되었습니다.', date: '2023-06-11T01:10:00+09:00', type: 'member', icon: '👥', color: 'secondary', importance: 5, isPublic: true, isAnniversary: false, relatedMembers: [], images: [], links: [], createdAt: '2023-06-11T01:10:00+09:00', updatedAt: '2023-06-11T01:10:00+09:00' },
  { title: '1주년 기념', description: 'Rangu.fam 결성 1주년을 맞이했습니다.', date: '2024-06-06T00:00:00+09:00', type: 'anniversary', icon: '🎂', color: 'primary', importance: 4, isPublic: true, isAnniversary: true, relatedMembers: [], images: [], links: [], createdAt: '2024-06-06T00:00:00+09:00', updatedAt: '2024-06-06T00:00:00+09:00' },
  { title: '2주년 기념', description: 'Rangu.fam 결성 2주년을 맞이했습니다.', date: '2025-06-06T00:00:00+09:00', type: 'anniversary', icon: '🎉', color: 'primary', importance: 4, isPublic: true, isAnniversary: true, relatedMembers: [], images: [], links: [], createdAt: '2025-06-06T00:00:00+09:00', updatedAt: '2025-06-06T00:00:00+09:00' },
  { title: '이승찬 임시멤버 합류', description: '정진규의 군 입대로 인해 이승찬이 임시멤버로 합류했습니다.', date: '2025-07-21T00:00:00+09:00', type: 'member', icon: '👋', color: 'secondary', importance: 4, isPublic: true, isAnniversary: false, relatedMembers: [], images: [], links: [], createdAt: '2025-07-21T00:00:00+09:00', updatedAt: '2025-07-21T00:00:00+09:00' },
  { title: '이승찬 정식멤버 합류', description: '임시 활동을 마치고 이승찬이 랑구팸 정식 멤버로 승격되었습니다.', date: '2025-12-27T00:00:00+09:00', type: 'member', icon: '👋', color: 'secondary', importance: 4, isPublic: true, isAnniversary: false, relatedMembers: [], images: [], links: [], createdAt: '2025-12-27T00:00:00+09:00', updatedAt: '2025-12-27T00:00:00+09:00' },
] as any

const DEFAULT_MILESTONES = [
  { name: '100일', type: 'formation', targetDays: 100, emoji: '💯', color: 'primary', isCompleted: true, completedDate: '2023-09-14T11:45:00+09:00', celebrationDetails: { hasSpecialEvent: false, eventImages: [] }, createdAt: '2023-09-14T11:45:00+09:00', updatedAt: '2023-09-14T11:45:00+09:00' },
  { name: '365일 (1주년)', type: 'formation', targetDays: 365, emoji: '🎂', color: 'primary', isCompleted: true, completedDate: '2024-06-06T11:45:00+09:00', celebrationDetails: { hasSpecialEvent: false, eventImages: [] }, createdAt: '2024-06-06T11:45:00+09:00', updatedAt: '2024-06-06T11:45:00+09:00' },
  { name: '500일', type: 'formation', targetDays: 500, emoji: '🌟', color: 'secondary', isCompleted: true, completedDate: '2024-10-19T11:45:00+09:00', celebrationDetails: { hasSpecialEvent: false, eventImages: [] }, createdAt: '2024-10-19T11:45:00+09:00', updatedAt: '2024-10-19T11:45:00+09:00' },
  { name: '730일 (2주년)', type: 'formation', targetDays: 730, emoji: '🎉', color: 'primary', isCompleted: true, completedDate: '2025-06-06T11:45:00+09:00', celebrationDetails: { hasSpecialEvent: false, eventImages: [] }, createdAt: '2025-06-06T11:45:00+09:00', updatedAt: '2025-06-06T11:45:00+09:00' },
  { name: '1000일', type: 'formation', targetDays: 1000, emoji: '🚀', color: 'accent', isCompleted: false, celebrationDetails: { hasSpecialEvent: false, eventImages: [] }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { name: '1095일 (3주년)', type: 'formation', targetDays: 1095, emoji: '🎊', color: 'primary', isCompleted: false, celebrationDetails: { hasSpecialEvent: false, eventImages: [] }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { name: '1500일', type: 'formation', targetDays: 1500, emoji: '💎', color: 'luxury', isCompleted: false, celebrationDetails: { hasSpecialEvent: false, eventImages: [] }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { name: '1460일 (4주년)', type: 'formation', targetDays: 1460, emoji: '👑', color: 'primary', isCompleted: false, celebrationDetails: { hasSpecialEvent: false, eventImages: [] }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { name: '2000일', type: 'formation', targetDays: 2000, emoji: '🌈', color: 'rainbow', isCompleted: false, celebrationDetails: { hasSpecialEvent: false, eventImages: [] }, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
] as any

const DEFAULT_STATS = {
  totalVisits: 0, uniqueVisitors: 0, totalPages: 8, totalUsers: 5,
  totalPosts: 0, totalComments: 0, totalLikes: 0,
  totalMusicPlays: 0, totalGameScores: 0, monthlyStats: [],
}

async function ensureRow() {
  const db = getDb()
  const [existing] = await db.select().from(siteHistory).limit(1)
  if (existing) return existing
  const [created] = await db
    .insert(siteHistory)
    .values({
      siteName: 'Rangu.fam',
      siteDescription: '네 친구들의 소중한 공간',
      formationDate: new Date('2023-06-06T11:45:00+09:00'),
      completeDate: new Date('2023-06-11T01:10:00+09:00'),
      siteCreationDate: new Date('2024-01-01T00:00:00+09:00'),
      events: DEFAULT_EVENTS,
      milestones: DEFAULT_MILESTONES,
      stats: DEFAULT_STATS,
      plannedEvents: [],
      versionHistory: [],
    })
    .returning()
  return created
}

export async function GET(request: NextRequest) {
  try {
    const row = await ensureRow()
    const type = new URL(request.url).searchParams.get('type')
    let data: any
    switch (type) {
      case 'events': data = { events: row.events }; break
      case 'milestones': data = { milestones: row.milestones }; break
      case 'stats': data = { stats: row.stats }; break
      default: data = row
    }
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('사이트 히스토리 조회 오류:', error)
    return NextResponse.json({ success: false, error: '사이트 히스토리를 불러오는데 실패했습니다.' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const row = await ensureRow()
    const body = await request.json()
    const { type, eventData, milestoneData } = body

    if (type === 'event' && eventData) {
      const events = Array.isArray(row.events) ? [...row.events as any[], eventData] : [eventData]
      const [updated] = await db.update(siteHistory).set({ events: events as any, updatedAt: new Date() }).returning()
      return NextResponse.json({ success: true, data: updated })
    }
    if (type === 'milestone' && milestoneData) {
      const milestones = Array.isArray(row.milestones) ? [...row.milestones as any[], milestoneData] : [milestoneData]
      const [updated] = await db.update(siteHistory).set({ milestones: milestones as any, updatedAt: new Date() }).returning()
      return NextResponse.json({ success: true, data: updated })
    }

    return NextResponse.json({ success: false, error: '지원하지 않는 type' }, { status: 400 })
  } catch (error) {
    console.error('사이트 히스토리 추가 오류:', error)
    return NextResponse.json({ success: false, error: '데이터 추가에 실패했습니다.' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const db = getDb()
    const row = await ensureRow()
    const body = await request.json()
    const { statsUpdate } = body
    if (!statsUpdate || typeof statsUpdate !== 'object') {
      return NextResponse.json({ success: false, error: 'statsUpdate가 필요합니다.' }, { status: 400 })
    }
    const current = (row.stats || {}) as Record<string, any>
    const next = { ...current }
    for (const [k, delta] of Object.entries(statsUpdate)) {
      if (typeof current[k] === 'number') next[k] = current[k] + Number(delta)
    }
    const [updated] = await db.update(siteHistory).set({ stats: next as any, updatedAt: new Date() }).returning()
    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    console.error('사이트 히스토리 업데이트 오류:', error)
    return NextResponse.json({ success: false, error: '데이터 업데이트에 실패했습니다.' }, { status: 500 })
  }
}
