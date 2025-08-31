import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { WikiPage, WikiUser } from '@/models/Wiki'
import jwt from 'jsonwebtoken'
export const dynamic = 'force-dynamic'

const JWT_SECRET = process.env.JWT_SECRET || 'rangu-wiki-secret'

async function getUserFromToken(request: NextRequest) {
  const token = request.cookies.get('wiki-token')?.value
  if (!token) return null
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    const user = await WikiUser.findById(decoded.userId)
    return user
  } catch {
    return null
  }
}

// 목록 조회: /api/wiki/discussions?title=문서명
export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title')
    if (!title) return NextResponse.json({ success: false, error: 'title 필요' }, { status: 400 })
    const page = await WikiPage.findOne({ $or: [{ title }, { slug: title }], isDeleted: { $ne: true } })
    if (!page) return NextResponse.json({ success: false, error: '문서를 찾을 수 없습니다.' }, { status: 404 })
    return NextResponse.json({ success: true, discussions: page.discussions || [] })
  } catch (e) {
    console.error('토론 조회 오류:', e)
    return NextResponse.json({ success: false, error: '토론 조회 중 오류' }, { status: 500 })
  }
}

// 새 토론 생성
export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    const { title, topic, content, category } = await request.json()
    if (!title || !topic || !content) return NextResponse.json({ success: false, error: '필수 항목 누락' }, { status: 400 })
    const page = await WikiPage.findOne({ $or: [{ title }, { slug: title }], isDeleted: { $ne: true } })
    if (!page) return NextResponse.json({ success: false, error: '문서를 찾을 수 없습니다.' }, { status: 404 })

    const thread = {
      pageId: page._id,
      title: topic,
      content,
      author: user.username,
      authorId: user._id,
      category: category || 'general',
      priority: 'normal',
      status: 'open',
      replies: [],
      views: 0,
      participants: [user._id],
      tags: [],
      isLocked: false
    }
    page.discussions.push(thread as any)
    await page.save()
    return NextResponse.json({ success: true, message: '토론이 생성되었습니다.' })
  } catch (e) {
    console.error('토론 생성 오류:', e)
    return NextResponse.json({ success: false, error: '토론 생성 중 오류' }, { status: 500 })
  }
}

// 상태 변경/잠금/답글 추가 등은 문서화 단순화를 위해 PATCH로 통합
export async function PATCH(request: NextRequest) {
  try {
    await dbConnect()
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    const { title, action, discussionId, payload } = await request.json()
    const page = await WikiPage.findOne({ $or: [{ title }, { slug: title }], isDeleted: { $ne: true } })
    if (!page) return NextResponse.json({ success: false, error: '문서를 찾을 수 없습니다.' }, { status: 404 })
    const d = (page.discussions as any[]).find((t: any) => String(t._id) === String(discussionId))
    if (!d) return NextResponse.json({ success: false, error: '토론 스레드를 찾을 수 없습니다.' }, { status: 404 })

    switch (action) {
      case 'reply': {
        if (d.isLocked) return NextResponse.json({ success: false, error: '잠긴 토론입니다.' }, { status: 403 })
        d.replies.push({ content: payload?.content, author: user.username, authorId: user._id, timestamp: new Date() })
        break
      }
      case 'status': {
        d.status = payload?.status || d.status
        break
      }
      case 'lock': {
        d.isLocked = Boolean(payload?.isLocked)
        d.lockedBy = user.username
        d.lockReason = payload?.reason
        break
      }
      default:
        return NextResponse.json({ success: false, error: '지원하지 않는 action' }, { status: 400 })
    }

    await page.save()
    return NextResponse.json({ success: true, message: '업데이트되었습니다.' })
  } catch (e) {
    console.error('토론 업데이트 오류:', e)
    return NextResponse.json({ success: false, error: '토론 업데이트 중 오류' }, { status: 500 })
  }
}


