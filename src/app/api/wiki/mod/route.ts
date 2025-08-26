import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import { WikiSubmission, WikiPage, WikiUser } from '@/models/Wiki'
import { isModeratorOrAbove } from '@/app/api/wiki/_utils/policy'
import { DiscordWebhookService } from '@/services/discordWebhookService'
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

export async function GET(request: NextRequest) {
  await dbConnect()
  const user = await getUserFromToken(request)
  if (!user || !isModeratorOrAbove(user as any)) {
    return NextResponse.json({ success: false, error: '권한 없음' }, { status: 403 })
  }
  const { searchParams } = new URL(request.url)
  const status = (searchParams.get('status') || 'pending') as any
  const list = await WikiSubmission.find({ status }).sort({ createdAt: -1 }).lean()
  return NextResponse.json({ success: true, submissions: list })
}

export async function POST(request: NextRequest) {
  await dbConnect()
  const user = await getUserFromToken(request)
  if (!user || !isModeratorOrAbove(user as any)) {
    return NextResponse.json({ success: false, error: '권한 없음' }, { status: 403 })
  }
  const { action, submissionId, reason } = await request.json()
  const sub = await WikiSubmission.findById(submissionId)
  if (!sub || sub.status !== 'pending') return NextResponse.json({ success: false, error: '대상이 없거나 처리됨' }, { status: 404 })

  if (action === 'reject') {
    sub.status = 'rejected'
    sub.reason = reason || ''
    sub.reviewedBy = user.username
    sub.reviewerId = user._id
    sub.reviewedAt = new Date()
    await sub.save()
    
    // 디스코드 웹훅 전송
    try {
      await DiscordWebhookService.sendDocumentApprove(
        user.username,
        sub.author,
        sub.targetTitle,
        'rejected',
        reason
      )
    } catch (error) {
      console.error('디스코드 웹훅 전송 오류:', error)
    }
    
    return NextResponse.json({ success: true, message: '반려 처리되었습니다.' })
  }

  if (action === 'hold') {
    sub.status = 'onhold'
    sub.reason = reason || ''
    sub.reviewedBy = user.username
    sub.reviewerId = user._id
    sub.reviewedAt = new Date()
    await sub.save()
    
    // 디스코드 웹훅 전송
    try {
      await DiscordWebhookService.sendDocumentApprove(
        user.username,
        sub.author,
        sub.targetTitle,
        'hold',
        reason
      )
    } catch (error) {
      console.error('디스코드 웹훅 전송 오류:', error)
    }
    
    return NextResponse.json({ success: true, message: '보류 처리되었습니다.' })
  }

  if (action === 'approve') {
    if (sub.type === 'create') {
      const newPage = new WikiPage({
        title: sub.targetTitle,
        slug: sub.targetSlug,
        namespace: sub.namespace,
        content: sub.content,
        summary: sub.summary,
        categories: sub.categories,
        tags: sub.tags,
        creator: sub.author,
        creatorId: sub.authorId,
        lastEditor: sub.author,
        lastEditorId: sub.authorId,
        lastEditDate: new Date(),
        lastEditSummary: sub.editSummary || '문서 생성(승인)',
        currentRevision: 1,
        protection: { level: 'none' },
        isRedirect: false,
        isDeleted: false,
        isStub: sub.content.length < 500,
        isFeatured: false,
        views: 0,
        uniqueViews: 0,
        edits: 1,
        watchers: [sub.authorId],
        discussions: [],
        incomingLinks: [],
        outgoingLinks: [],
        tableOfContents: []
      })
      await newPage.save()
    } else {
      const page = await WikiPage.findById(sub.pageId)
      if (!page) return NextResponse.json({ success: false, error: '원문서 없음' }, { status: 404 })
      const prevLen = page.content.length
      page.content = sub.content
      page.summary = sub.summary
      page.lastEditor = sub.author
      page.lastEditorId = sub.authorId
      page.lastEditDate = new Date()
      page.lastEditSummary = sub.editSummary || '문서 편집(승인)'
      page.currentRevision += 1
      page.edits += 1
      page.revisions.push({
        pageId: page._id,
        revisionNumber: page.currentRevision,
        content: sub.content,
        summary: sub.editSummary || '문서 편집(승인)',
        author: sub.author,
        authorId: sub.authorId,
        editType: 'edit',
        isMinorEdit: false,
        isAutomated: false,
        contentLength: sub.content.length,
        sizeChange: sub.content.length - prevLen,
        isReverted: false,
        isVerified: true,
        timestamp: new Date()
      } as any)
      await page.save()
    }
    sub.status = 'approved'
    sub.reviewedBy = user.username
    sub.reviewerId = user._id
    sub.reviewedAt = new Date()
    await sub.save()
    
    // 디스코드 웹훅 전송
    try {
      await DiscordWebhookService.sendDocumentApprove(
        user.username,
        sub.author,
        sub.targetTitle,
        'approved'
      )
    } catch (error) {
      console.error('디스코드 웹훅 전송 오류:', error)
    }
    
    return NextResponse.json({ success: true, message: '승인 처리되었습니다.' })
  }

  return NextResponse.json({ success: false, error: '잘못된 요청' }, { status: 400 })
}


