import { getRequiredEnv } from '@/lib/env'
import { NextRequest, NextResponse } from 'next/server'
import { and, asc, desc, eq, ilike, ne, or, sql } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import { getDb } from '@/db/client'
import { wikiPages, wikiRevisions, wikiSubmissions, wikiUsers } from '@/db/schema/wiki'
import { extractCategoriesFromContent } from '@/lib/wikiCategories'
import { canEditPage, isModeratorOrAbove, isRateLimited } from '@/app/api/wiki/_utils/policy'
import { appendAuditLog } from '@/app/api/wiki/_utils/audit'
import { createCaptchaChallenge, hasValidCaptchaPass } from '@/app/api/wiki/_utils/captcha'
import { DiscordWebhookService } from '@/services/discordWebhookService'
import { enforceUserAccessPolicy, isWhitelistedWikiAdmin } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

const JWT_SECRET = getRequiredEnv('JWT_SECRET')

// ── 헬퍼: 슬러그 / 목차 / 링크 추출 ─────────────────────────────
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function generateTableOfContents(content: string) {
  const headings: Array<{ level: number; title: string; anchor: string }> = []
  for (const rawLine of content.split('\n')) {
    const trimmed = rawLine.trim()
    if (!trimmed) continue
    let level = 0
    let title = ''
    const namuMatch = trimmed.match(/^(=+)\s*(.+?)\s*=+$/)
    if (namuMatch) {
      level = namuMatch[1].length
      title = namuMatch[2].trim()
    } else if (trimmed.startsWith('#')) {
      const mdMatch = trimmed.match(/^(#+)\s*(.+)$/)
      if (mdMatch) {
        level = mdMatch[1].length
        title = mdMatch[2].trim()
      }
    }
    if (level > 0 && title) {
      headings.push({ level, title, anchor: toSlug(title) })
    }
  }
  return headings
}

function extractLinks(content: string): string[] {
  const links: string[] = []
  const re = /\[\[([^\]]+)\]\]/g
  let m: RegExpExecArray | null
  while ((m = re.exec(content)) !== null) {
    const target = m[1].split('|')[0].trim()
    if (target && !links.includes(target)) links.push(target)
  }
  return links
}

// ── 인증: wiki-token 쿠키 또는 Authorization 헤더 ──────────────
async function getUserFromToken(request: NextRequest) {
  const cookieToken = request.cookies.get('wiki-token')?.value
  const authHeader = request.headers.get('Authorization')
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null
  const token = cookieToken || bearerToken
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
    ;(user as any)._id = user.id // legacy code 호환
    return enforceUserAccessPolicy(user as any)
  } catch {
    return null
  }
}

// 응답 형태 (GET 호환 유지)
function toPageResponse(p: any) {
  const derivedCategories =
    p.categories && p.categories.length > 0
      ? p.categories
      : extractCategoriesFromContent(p.content || '')
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    namespace: p.namespace,
    content: p.content,
    summary: p.summary,
    categories: derivedCategories,
    tags: p.tags,
    creator: p.creator,
    creatorId: p.creatorId,
    lastEditor: p.lastEditor,
    lastEditorId: p.lastEditorId,
    lastEditDate: p.lastEditDate,
    lastEditSummary: p.lastEditSummary,
    currentRevision: p.currentRevision,
    protection: p.protection,
    isRedirect: p.isRedirect,
    redirectTarget: p.redirectTarget,
    isStub: p.isStub,
    isFeatured: p.isFeatured,
    views: p.views,
    uniqueViews: p.uniqueViews,
    edits: p.edits,
    tableOfContents: p.tableOfContents,
    incomingLinks: p.incomingLinks || [],
    outgoingLinks: p.outgoingLinks || [],
    watchers: p.watchers || [],
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }
}

// ── 자동 잠금 만료 정리 ────────────────────────────────────────
async function cleanupExpiredLocks() {
  try {
    const db = getDb()
    const now = new Date().toISOString()
    // editLock.lockExpiry < now 인 row만 잠금 해제
    await db.execute(sql`
      UPDATE wiki_pages
      SET edit_lock = jsonb_build_object(
        'isLocked', false,
        'lockReason', 'editing'
      )
      WHERE (edit_lock->>'isLocked')::boolean = true
        AND (edit_lock->>'lockExpiry') IS NOT NULL
        AND (edit_lock->>'lockExpiry') < ${now}
    `)
  } catch (e) {
    console.warn('자동 잠금 해제 실패:', e)
  }
}

// ───────────────────────────────────────────────────────────────
// GET — 단일 페이지 조회 또는 목록
// ───────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const db = getDb()
    await cleanupExpiredLocks()

    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title')
    const slug = searchParams.get('slug')
    const search = searchParams.get('search')
    let namespace = searchParams.get('namespace')

    if (!namespace && (title === '도움말' || title === '이랑위키:도움말' || title?.includes('도움말'))) {
      namespace = 'help'
    }
    if (!namespace) namespace = 'main'

    const category = searchParams.get('category')
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100)
    const skip = parseInt(searchParams.get('skip') || '0')
    const sort = searchParams.get('sort') || 'title'

    if (title) {
      let [page] = await db
        .select()
        .from(wikiPages)
        .where(
          and(
            eq(wikiPages.title, title),
            eq(wikiPages.namespace, namespace),
            ne(wikiPages.isDeleted, true)
          )
        )
        .limit(1)

      if (!page) {
        const [bySlug] = await db
          .select()
          .from(wikiPages)
          .where(
            and(
              eq(wikiPages.slug, title),
              eq(wikiPages.namespace, namespace),
              ne(wikiPages.isDeleted, true)
            )
          )
          .limit(1)
        page = bySlug
      }

      if (!page) {
        const canonicalSlug = toSlug(title)
        if (canonicalSlug && canonicalSlug !== title) {
          const [byCanonical] = await db
            .select()
            .from(wikiPages)
            .where(
              and(
                eq(wikiPages.slug, canonicalSlug),
                eq(wikiPages.namespace, namespace),
                ne(wikiPages.isDeleted, true)
              )
            )
            .limit(1)
          page = byCanonical
        }
      }

      if (!page && (title === '도움말' || title.includes('도움말'))) {
        const [helpPage] = await db
          .select()
          .from(wikiPages)
          .where(
            and(
              or(ilike(wikiPages.title, '%도움말%'), eq(wikiPages.title, '이랑위키:도움말')),
              ne(wikiPages.isDeleted, true)
            )
          )
          .limit(1)
        page = helpPage
      }

      // 마지막 폴백 — 어떤 namespace 든 title/slug 일치하는 페이지 (이랑위키:문법, 이랑위키:규정 같은 help namespace 페이지 지원)
      if (!page) {
        const [anyNs] = await db
          .select()
          .from(wikiPages)
          .where(
            and(
              or(eq(wikiPages.title, title), eq(wikiPages.slug, title), eq(wikiPages.slug, toSlug(title))),
              ne(wikiPages.isDeleted, true)
            )
          )
          .limit(1)
        page = anyNs
      }

      if (!page) {
        return NextResponse.json(
          { success: false, error: '문서를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }

      try {
        await db
          .update(wikiPages)
          .set({
            views: sql`${wikiPages.views} + 1`,
            uniqueViews: sql`${wikiPages.uniqueViews} + 1`,
          })
          .where(eq(wikiPages.id, page.id))
      } catch {}

      return NextResponse.json({ success: true, page: toPageResponse(page) })
    }

    if (slug) {
      const [page] = await db
        .select()
        .from(wikiPages)
        .where(
          and(
            eq(wikiPages.slug, slug),
            eq(wikiPages.namespace, namespace),
            ne(wikiPages.isDeleted, true)
          )
        )
        .limit(1)

      if (!page) {
        return NextResponse.json(
          { success: false, error: '문서를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }
      return NextResponse.json({ success: true, page: toPageResponse(page) })
    }

    // 목록
    const conditions: any[] = [
      ne(wikiPages.isDeleted, true),
      eq(wikiPages.namespace, namespace),
    ]

    if (search) {
      const pattern = `%${search.replace(/[%_]/g, (c) => `\\${c}`)}%`
      conditions.push(
        or(
          ilike(wikiPages.title, pattern),
          ilike(wikiPages.content, pattern),
          ilike(wikiPages.summary, pattern),
          sql`EXISTS (SELECT 1 FROM unnest(${wikiPages.tags}) AS t WHERE t ILIKE ${pattern})`
        )
      )
    }

    if (category) {
      conditions.push(sql`${category} = ANY(${wikiPages.categories})`)
    }

    let orderBy: any
    switch (sort) {
      case 'views':
        orderBy = desc(wikiPages.views)
        break
      case 'lastEdit':
        orderBy = desc(wikiPages.lastEditDate)
        break
      case 'created':
        orderBy = desc(wikiPages.createdAt)
        break
      default:
        orderBy = asc(wikiPages.title)
    }

    const where = and(...conditions)

    const rows = await db
      .select()
      .from(wikiPages)
      .where(where as any)
      .orderBy(orderBy)
      .offset(skip)
      .limit(limit)

    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(wikiPages)
      .where(where as any)

    return NextResponse.json({
      success: true,
      pages: rows.map(toPageResponse),
      pagination: {
        total,
        skip,
        limit,
        hasMore: skip + rows.length < total,
      },
    })
  } catch (error) {
    console.error('위키 페이지 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '위키 페이지 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// ───────────────────────────────────────────────────────────────
// POST — 새 위키 문서 생성
// ───────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const db = getDb()

    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }
    if (!user.permissions?.canEdit) {
      return NextResponse.json(
        { success: false, error: '문서 편집 권한이 없습니다.' },
        { status: 403 }
      )
    }

    const {
      title,
      content,
      summary,
      namespace = 'main',
      categories = [],
      tags = [],
      isRedirect = false,
      redirectTarget,
      editSummary,
      isMinorEdit,
    } = await request.json()

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: '제목과 내용은 필수입니다.' },
        { status: 400 }
      )
    }

    // 레이트리밋 + CAPTCHA
    const rateKey = `edit:${user.id}`
    if (isRateLimited(rateKey, 10) && !hasValidCaptchaPass(request)) {
      const { token, question } = createCaptchaChallenge()
      return NextResponse.json(
        {
          success: false,
          error: '편집이 일시적으로 제한되었습니다. CAPTCHA를 완료하세요.',
          captcha: { token, question },
        },
        { status: 429 }
      )
    }

    // 네임스페이스 작성 가드
    const restrictedNs = ['template', 'project']
    if (restrictedNs.includes(namespace) && !isModeratorOrAbove(user as any)) {
      return NextResponse.json(
        { success: false, error: '이 네임스페이스는 운영 권한이 필요합니다.' },
        { status: 403 }
      )
    }

    const slug = toSlug(title)

    // 중복 제목/슬러그 검사
    const [existingPage] = await db
      .select({ id: wikiPages.id })
      .from(wikiPages)
      .where(
        and(
          eq(wikiPages.namespace, namespace),
          ne(wikiPages.isDeleted, true),
          or(eq(wikiPages.title, title), eq(wikiPages.slug, slug))
        )
      )
      .limit(1)

    if (existingPage) {
      return NextResponse.json(
        { success: false, error: '이미 존재하는 문서 제목입니다.' },
        { status: 409 }
      )
    }

    const tableOfContents = generateTableOfContents(content)
    const isOperator =
      isModeratorOrAbove(user as any) ||
      user.role === 'admin' ||
      user.role === 'owner' ||
      isWhitelistedWikiAdmin(user as any) // email 화이트리스트 대상자는 즉시 운영자 권한

    // 일반 사용자 → 승인 대기 큐
    if (!isOperator) {
      const [submission] = await db
        .insert(wikiSubmissions)
        .values({
          type: 'create',
          status: 'pending',
          namespace,
          targetTitle: title,
          targetSlug: slug,
          pageId: null,
          content,
          summary: summary || null,
          editSummary: editSummary || null,
          categories: Array.isArray(categories) ? categories : [],
          tags: Array.isArray(tags) ? tags : [],
          expectedRevision: 0,
          author: user.username,
          authorId: user.id,
        })
        .returning({ id: wikiSubmissions.id })

      return NextResponse.json({
        success: true,
        pending: true,
        message: '승인 대기 중입니다.',
        submissionId: submission.id,
      })
    }

    // 운영자 이상 → 즉시 생성 (페이지 + 첫 리비전 트랜잭션)
    const now = new Date()
    const [savedPage] = await db
      .insert(wikiPages)
      .values({
        title,
        slug,
        namespace,
        content,
        summary: summary || null,
        categories: Array.isArray(categories) ? categories : [],
        tags: Array.isArray(tags) ? tags : [],
        creator: user.username,
        creatorId: user.id,
        lastEditor: user.username,
        lastEditorId: user.id,
        lastEditDate: now,
        lastEditSummary: editSummary || '문서 생성',
        currentRevision: 1,
        isRedirect: Boolean(isRedirect),
        redirectTarget: isRedirect ? redirectTarget || null : null,
        isStub: content.length < 500,
        edits: 1,
        watchers: [user.id],
        outgoingLinks: extractLinks(content),
        tableOfContents,
      })
      .returning()

    await db.insert(wikiRevisions).values({
      pageId: savedPage.id,
      revisionNumber: 1,
      content,
      summary: editSummary || '문서 생성',
      author: user.username,
      authorId: user.id,
      editType: 'create',
      isMinorEdit: Boolean(isMinorEdit),
      isAutomated: false,
      contentLength: content.length,
      sizeChange: content.length,
      timestampAt: now,
    })

    // 사용자 통계
    await db
      .update(wikiUsers)
      .set({
        edits: sql`${wikiUsers.edits} + 1`,
        pagesCreated: sql`${wikiUsers.pagesCreated} + 1`,
        lastActivity: now,
      })
      .where(eq(wikiUsers.id, user.id))

    // 링크 그래프 동기화 — 새 outgoing 링크의 target 페이지들에 우리 title을 incoming으로 추가
    try {
      const newLinks = extractLinks(content)
      if (newLinks.length > 0) {
        await db.execute(sql`
          UPDATE wiki_pages
          SET incoming_links = (
            SELECT array_agg(DISTINCT x)
            FROM unnest(array_append(COALESCE(incoming_links, ARRAY[]::text[]), ${title})) AS x
          )
          WHERE title = ANY(${newLinks}) AND is_deleted IS NOT TRUE
        `)
      }
    } catch (e) {
      console.warn('incoming_links 갱신 실패:', e)
    }

    // Discord webhook (best-effort)
    try {
      const contentPreview = content.length > 200 ? content.substring(0, 200) + '...' : content
      await DiscordWebhookService.sendDocumentCreate(
        user.username,
        title,
        summary || '새로운 문서가 생성되었습니다',
        contentPreview
      )
    } catch (webhookError) {
      console.error('Discord webhook 전송 실패:', webhookError)
    }

    appendAuditLog({ actor: user.username, action: 'page.create', meta: { title } })
    return NextResponse.json({
      success: true,
      message: '문서가 성공적으로 생성되었습니다.',
      page: {
        id: savedPage.id,
        title: savedPage.title,
        slug: savedPage.slug,
        namespace: savedPage.namespace,
      },
    })
  } catch (error) {
    console.error('위키 문서 생성 오류:', error)
    return NextResponse.json(
      { success: false, error: '문서 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// ───────────────────────────────────────────────────────────────
// PUT — 기존 위키 문서 업데이트
// ───────────────────────────────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const db = getDb()

    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
    }
    if (!user.permissions?.canEdit) {
      return NextResponse.json(
        { success: false, error: '문서 편집 권한이 없습니다.' },
        { status: 403 }
      )
    }

    const { title, content, summary, editSummary, expectedRevision } = await request.json()
    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: '제목과 내용은 필수입니다.' },
        { status: 400 }
      )
    }

    // 기존 문서 찾기 (title 또는 slug)
    const [existingPage] = await db
      .select()
      .from(wikiPages)
      .where(
        and(
          ne(wikiPages.isDeleted, true),
          or(eq(wikiPages.title, title), eq(wikiPages.slug, title))
        )
      )
      .limit(1)

    if (!existingPage) {
      return NextResponse.json(
        { success: false, error: '업데이트할 문서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (!canEditPage(user as any, existingPage as any)) {
      return NextResponse.json(
        { success: false, error: '보호된 문서이므로 현재 권한으로는 편집할 수 없습니다.' },
        { status: 403 }
      )
    }

    const rateKey = `edit:${user.id}`
    if (isRateLimited(rateKey, 10) && !hasValidCaptchaPass(request)) {
      const { token, question } = createCaptchaChallenge()
      return NextResponse.json(
        {
          success: false,
          error: '편집이 일시적으로 제한되었습니다. CAPTCHA를 완료하세요.',
          captcha: { token, question },
        },
        { status: 429 }
      )
    }

    const isOperator =
      isModeratorOrAbove(user as any) ||
      user.role === 'admin' ||
      user.role === 'owner' ||
      isWhitelistedWikiAdmin(user as any) // email/username 화이트리스트 대상자는 즉시 운영자 권한

    // 편집 충돌 감지 — 운영자는 강제 덮어쓰기 가능 (편집 화면이 stale 해도 최신 내용 위에 직접 반영)
    if (
      !isOperator &&
      typeof expectedRevision === 'number' &&
      existingPage.currentRevision !== expectedRevision
    ) {
      return NextResponse.json(
        {
          success: false,
          error: '편집 충돌이 발생했습니다. 최신 내용을 반영한 후 다시 시도하세요.',
          conflict: { currentRevision: existingPage.currentRevision },
        },
        { status: 409 }
      )
    }

    // 일반 사용자 → 승인 대기 큐
    if (!isOperator) {
      await db.insert(wikiSubmissions).values({
        type: 'edit',
        status: 'pending',
        namespace: existingPage.namespace,
        targetTitle: existingPage.title,
        targetSlug: existingPage.slug,
        pageId: existingPage.id,
        content,
        summary: summary || null,
        editSummary: editSummary || null,
        categories: existingPage.categories,
        tags: existingPage.tags,
        expectedRevision: typeof expectedRevision === 'number' ? expectedRevision : null,
        author: user.username,
        authorId: user.id,
      })
      return NextResponse.json({
        success: true,
        pending: true,
        message: '승인 대기 중입니다.',
      })
    }

    // 운영자 → 즉시 반영
    const now = new Date()
    const newRevisionNumber = existingPage.currentRevision + 1
    const sizeChange = content.length - (existingPage.content?.length || 0)
    const tableOfContents = generateTableOfContents(content)

    await db.insert(wikiRevisions).values({
      pageId: existingPage.id,
      revisionNumber: newRevisionNumber,
      content,
      summary: editSummary || '문서 편집',
      author: user.username,
      authorId: user.id,
      editType: 'edit',
      isMinorEdit: false,
      isAutomated: false,
      contentLength: content.length,
      sizeChange,
      timestampAt: now,
    })

    await db
      .update(wikiPages)
      .set({
        content,
        summary: summary || existingPage.summary,
        lastEditor: user.username,
        lastEditorId: user.id,
        lastEditDate: now,
        lastEditSummary: editSummary || '문서 편집',
        currentRevision: newRevisionNumber,
        edits: existingPage.edits + 1,
        outgoingLinks: extractLinks(content),
        tableOfContents,
        isStub: content.length < 500,
        updatedAt: now,
      })
      .where(eq(wikiPages.id, existingPage.id))

    await db
      .update(wikiUsers)
      .set({
        edits: sql`${wikiUsers.edits} + 1`,
        lastActivity: now,
      })
      .where(eq(wikiUsers.id, user.id))

    // 링크 그래프 동기화 (편집 시) — 새 outgoing 의 target 페이지에 우리 title 을 incoming 추가
    // 단순화를 위해 "추가" 만 처리. 기존 링크가 제거된 경우의 cleanup 은 후속 cron 작업으로.
    try {
      const newLinks = extractLinks(content)
      const oldLinks = Array.isArray(existingPage.outgoingLinks) ? existingPage.outgoingLinks : []
      const added = newLinks.filter((l) => !oldLinks.includes(l))
      if (added.length > 0) {
        await db.execute(sql`
          UPDATE wiki_pages
          SET incoming_links = (
            SELECT array_agg(DISTINCT x)
            FROM unnest(array_append(COALESCE(incoming_links, ARRAY[]::text[]), ${title})) AS x
          )
          WHERE title = ANY(${added}) AND is_deleted IS NOT TRUE
        `)
      }
    } catch (e) {
      console.warn('incoming_links 갱신 실패:', e)
    }

    try {
      const contentChange = `리비전 ${newRevisionNumber}로 업데이트\n차이: ${sizeChange > 0 ? '+' : ''}${sizeChange}바이트`
      await DiscordWebhookService.sendDocumentEdit(
        user.username,
        title,
        editSummary || '문서 편집',
        contentChange
      )
    } catch (webhookError) {
      console.error('Discord webhook 전송 실패:', webhookError)
    }

    appendAuditLog({ actor: user.username, action: 'page.update', meta: { title } })
    return NextResponse.json({
      success: true,
      message: '문서가 성공적으로 업데이트되었습니다.',
      page: {
        id: existingPage.id,
        title: existingPage.title,
        slug: existingPage.slug,
        namespace: existingPage.namespace,
      },
    })
  } catch (error) {
    console.error('위키 문서 업데이트 오류:', error)
    return NextResponse.json(
      { success: false, error: '문서 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
