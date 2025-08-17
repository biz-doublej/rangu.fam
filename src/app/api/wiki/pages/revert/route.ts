import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { WikiPage, WikiUser } from '@/models/Wiki'
import jwt from 'jsonwebtoken'
import { canEditPage } from '@/app/api/wiki/_utils/policy'
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

// POST /api/wiki/pages/revert
// body: { title, revisionNumber, summary? }
export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })

    const { title, revisionNumber, summary } = await request.json()
    if (!title || !revisionNumber) {
      return NextResponse.json({ success: false, error: 'title과 revisionNumber는 필수입니다.' }, { status: 400 })
    }

    const page = await WikiPage.findOne({ $or: [{ title }, { slug: title }], isDeleted: { $ne: true } })
    if (!page) return NextResponse.json({ success: false, error: '문서를 찾을 수 없습니다.' }, { status: 404 })

    if (!canEditPage(user as any, page as any)) {
      return NextResponse.json({ success: false, error: '보호된 문서이므로 되돌리기 권한이 없습니다.' }, { status: 403 })
    }

    const targetRev = page.revisions.find((r: any) => r.revisionNumber === Number(revisionNumber))
    if (!targetRev) return NextResponse.json({ success: false, error: '대상 리비전을 찾을 수 없습니다.' }, { status: 404 })

    // 되돌리기 리비전 생성
    const newRevisionNumber = page.currentRevision + 1
    const newContent = targetRev.content
    const newRevision = {
      pageId: page._id,
      revisionNumber: newRevisionNumber,
      content: newContent,
      summary: summary || `Revert to r${revisionNumber}`,
      author: user.username,
      authorId: user._id,
      editType: 'revert',
      isMinorEdit: false,
      isAutomated: false,
      contentLength: newContent.length,
      sizeChange: newContent.length - page.content.length,
      isReverted: false,
      isVerified: false,
      timestamp: new Date()
    }

    page.content = newContent
    page.lastEditor = user.username
    page.lastEditorId = user._id
    page.lastEditSummary = newRevision.summary
    page.lastEditDate = new Date()
    page.currentRevision = newRevisionNumber
    page.edits += 1
    page.revisions.push(newRevision as any)

    await page.save()

    return NextResponse.json({ success: true, message: '되돌리기 완료', revisionNumber: newRevisionNumber })
  } catch (e) {
    console.error('되돌리기 오류:', e)
    return NextResponse.json({ success: false, error: '되돌리기 처리 중 오류' }, { status: 500 })
  }
}


