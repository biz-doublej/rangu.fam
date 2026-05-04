import { getRequiredEnv } from '@/lib/env'
import { NextRequest, NextResponse } from 'next/server'
import { and, eq, ne, or } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import { getDb } from '@/db/client'
import { wikiPages, wikiUsers } from '@/db/schema/wiki'
import { enforceUserAccessPolicy } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

const JWT_SECRET = getRequiredEnv('JWT_SECRET')
const LOCK_DURATION = 10 * 60 * 1000 // 10분

async function getUserFromToken(request: NextRequest) {
  const token = request.cookies.get('wiki-token')?.value
  if (!token) return null
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    if (!decoded?.userId) return null
    const db = getDb()
    const [user] = await db
      .select()
      .from(wikiUsers)
      .where(eq(wikiUsers.id, decoded.userId))
      .limit(1)
    if (!user) return null
    return enforceUserAccessPolicy(user as any)
  } catch {
    return null
  }
}

async function findPageByTitleOrSlug(title: string) {
  const db = getDb()
  const [page] = await db
    .select()
    .from(wikiPages)
    .where(
      and(
        ne(wikiPages.isDeleted, true),
        or(eq(wikiPages.title, title), eq(wikiPages.slug, title))
      )
    )
    .limit(1)
  return page
}

const EMPTY_LOCK = { isLocked: false, lockReason: 'editing' }

function isExpired(lockExpiry?: string | null) {
  if (!lockExpiry) return false
  const exp = new Date(lockExpiry).getTime()
  return !Number.isNaN(exp) && Date.now() > exp
}

// GET - 잠금 상태 확인
export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title')
    if (!title) {
      return NextResponse.json({ success: false, error: 'title이 필요합니다.' }, { status: 400 })
    }

    const page = await findPageByTitleOrSlug(title)
    if (!page) {
      return NextResponse.json({ success: false, error: '문서를 찾을 수 없습니다.' }, { status: 404 })
    }

    const editLock = (page.editLock as any) || {}
    if (editLock.isLocked && isExpired(editLock.lockExpiry)) {
      await db
        .update(wikiPages)
        .set({ editLock: EMPTY_LOCK })
        .where(eq(wikiPages.id, page.id))
      return NextResponse.json({ success: true, isLocked: false })
    }

    return NextResponse.json({
      success: true,
      isLocked: editLock.isLocked || false,
      lockedBy: editLock.lockedBy,
      lockStartTime: editLock.lockStartTime,
      lockExpiry: editLock.lockExpiry,
    })
  } catch (error) {
    console.error('잠금 상태 확인 오류:', error)
    return NextResponse.json(
      { success: false, error: '잠금 상태 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// POST - 잠금 획득
export async function POST(request: NextRequest) {
  try {
    const db = getDb()
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { title } = await request.json()
    if (!title) {
      return NextResponse.json({ success: false, error: 'title이 필요합니다.' }, { status: 400 })
    }

    const page = await findPageByTitleOrSlug(title)
    if (!page) {
      return NextResponse.json({ success: false, error: '문서를 찾을 수 없습니다.' }, { status: 404 })
    }

    const now = new Date()
    let editLock = (page.editLock as any) || {}

    if (editLock.isLocked && isExpired(editLock.lockExpiry)) {
      editLock = { isLocked: false, lockReason: 'editing' }
    }

    if (editLock.isLocked && editLock.lockedById && editLock.lockedById !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: '다른 사용자가 편집 중입니다.',
          lockedBy: editLock.lockedBy,
          lockExpiry: editLock.lockExpiry,
        },
        { status: 409 }
      )
    }

    const lockExpiry = new Date(now.getTime() + LOCK_DURATION)
    const newEditLock = {
      isLocked: true,
      lockedBy: user.username,
      lockedById: user.id,
      lockStartTime: editLock.lockStartTime || now.toISOString(),
      lockExpiry: lockExpiry.toISOString(),
      lockReason: 'editing',
    }

    await db
      .update(wikiPages)
      .set({ editLock: newEditLock, updatedAt: now })
      .where(eq(wikiPages.id, page.id))

    return NextResponse.json({
      success: true,
      message: '편집 잠금을 획득했습니다.',
      lockExpiry,
    })
  } catch (error) {
    console.error('편집 잠금 획득 오류:', error)
    return NextResponse.json(
      { success: false, error: '편집 잠금 획득 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// PUT - 잠금 갱신
export async function PUT(request: NextRequest) {
  try {
    const db = getDb()
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { title } = await request.json()
    if (!title) {
      return NextResponse.json({ success: false, error: 'title이 필요합니다.' }, { status: 400 })
    }

    const page = await findPageByTitleOrSlug(title)
    if (!page) {
      return NextResponse.json({ success: false, error: '문서를 찾을 수 없습니다.' }, { status: 404 })
    }

    const editLock = (page.editLock as any) || {}
    if (!editLock.isLocked || editLock.lockedById !== user.id) {
      return NextResponse.json(
        { success: false, error: '편집 잠금을 소유하고 있지 않습니다.' },
        { status: 403 }
      )
    }

    const now = new Date()
    const lockExpiry = new Date(now.getTime() + LOCK_DURATION)
    await db
      .update(wikiPages)
      .set({
        editLock: { ...editLock, lockExpiry: lockExpiry.toISOString() },
        updatedAt: now,
      })
      .where(eq(wikiPages.id, page.id))

    return NextResponse.json({
      success: true,
      message: '편집 잠금이 갱신되었습니다.',
      lockExpiry,
    })
  } catch (error) {
    console.error('편집 잠금 갱신 오류:', error)
    return NextResponse.json(
      { success: false, error: '편집 잠금 갱신 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// DELETE - 잠금 해제
export async function DELETE(request: NextRequest) {
  try {
    const db = getDb()
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title')
    if (!title) {
      return NextResponse.json({ success: false, error: 'title이 필요합니다.' }, { status: 400 })
    }

    const page = await findPageByTitleOrSlug(title)
    if (!page) {
      return NextResponse.json({ success: false, error: '문서를 찾을 수 없습니다.' }, { status: 404 })
    }

    const editLock = (page.editLock as any) || {}
    const canRelease =
      editLock.lockedById === user.id || user.role === 'admin' || user.role === 'moderator'

    if (!canRelease) {
      return NextResponse.json(
        { success: false, error: '편집 잠금을 해제할 권한이 없습니다.' },
        { status: 403 }
      )
    }

    await db
      .update(wikiPages)
      .set({ editLock: EMPTY_LOCK, updatedAt: new Date() })
      .where(eq(wikiPages.id, page.id))

    return NextResponse.json({
      success: true,
      message: '편집 잠금이 해제되었습니다.',
    })
  } catch (error) {
    console.error('편집 잠금 해제 오류:', error)
    return NextResponse.json(
      { success: false, error: '편집 잠금 해제 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
