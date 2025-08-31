import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { WikiPage, WikiUser } from '@/models/Wiki'
import jwt from 'jsonwebtoken'
import { canMovePage } from '@/app/api/wiki/_utils/policy'
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

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const user = await getUserFromToken(request)
    if (!user) return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    if (!canMovePage(user as any)) return NextResponse.json({ success: false, error: '문서 이동 권한이 없습니다.' }, { status: 403 })

    const { fromTitle, toTitle, reason } = await request.json()
    if (!fromTitle || !toTitle) return NextResponse.json({ success: false, error: 'fromTitle, toTitle 필요' }, { status: 400 })

    const page = await WikiPage.findOne({ $or: [{ title: fromTitle }, { slug: fromTitle }], isDeleted: { $ne: true } })
    if (!page) return NextResponse.json({ success: false, error: '원본 문서를 찾을 수 없습니다.' }, { status: 404 })

    const existing = await WikiPage.findOne({ $or: [{ title: toTitle }, { slug: toTitle.toLowerCase() }], isDeleted: { $ne: true } })
    if (existing) return NextResponse.json({ success: false, error: '대상 제목이 이미 존재합니다.' }, { status: 409 })

    const oldTitle = page.title
    const oldSlug = page.slug

    // 원본 문서는 리다이렉트로 전환
    page.isRedirect = true
    page.redirectTarget = toTitle
    page.lastEditSummary = reason || `문서 이동: ${oldTitle} → ${toTitle}`
    await page.save()

    // 새 문서 생성 (내용 복사)
    const newPage = new WikiPage({
      title: toTitle,
      slug: toTitle.toLowerCase().replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '-'),
      namespace: page.namespace,
      content: `#REDIRECT [[${oldTitle}]]\n\n${page.content}`,
      summary: page.summary,
      categories: page.categories,
      tags: page.tags,
      creator: user.username,
      creatorId: user._id,
      lastEditor: user.username,
      lastEditorId: user._id,
      lastEditDate: new Date(),
      lastEditSummary: reason || `문서 이동: ${oldTitle} → ${toTitle}`,
      currentRevision: 1,
      protection: page.protection,
      isRedirect: false,
      isDeleted: false,
      isStub: page.isStub,
      isFeatured: page.isFeatured,
      views: 0,
      uniqueViews: 0,
      edits: 1,
      watchers: page.watchers,
      discussions: [],
      incomingLinks: page.incomingLinks,
      outgoingLinks: page.outgoingLinks,
      tableOfContents: page.tableOfContents
    })
    await newPage.save()

    return NextResponse.json({ success: true, message: '문서 이동 완료', from: oldTitle, to: toTitle })
  } catch (e) {
    console.error('문서 이동 오류:', e)
    return NextResponse.json({ success: false, error: '문서 이동 중 오류' }, { status: 500 })
  }
}


