import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import dbConnect from '@/lib/mongodb'
import { DiscordWebhookService } from '@/services/discordWebhookService'

export const dynamic = 'force-dynamic'
import { WikiPage, WikiUser, WikiSubmission } from '@/models/Wiki'
import { canEditPage, canProtectPage, isRateLimited, isModeratorOrAbove } from '@/app/api/wiki/_utils/policy'
import { appendAuditLog } from '@/app/api/wiki/_utils/audit'
import { createCaptchaChallenge, hasValidCaptchaPass, issueCaptchaPassCookie, verifyCaptchaChallenge } from '@/app/api/wiki/_utils/captcha'

const JWT_SECRET = process.env.JWT_SECRET || 'rangu-wiki-secret'

// 공통 슬러그/앵커 생성 규칙: 한글 포함, 소문자-하이픈
function toSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

// 토큰에서 사용자 정보 추출
async function getUserFromToken(request: NextRequest) {
  const token = request.cookies.get('wiki-token')?.value
  
  if (!token) {
    return null
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    const user = await WikiUser.findById(decoded.userId)
    return user
  } catch (error) {
    return null
  }
}

// 자동 잠금 해제: 만료된 잠금 정리
async function cleanupExpiredLocks() {
  try {
    const now = new Date()
    const result = await WikiPage.updateMany(
      {
        'editLock.isLocked': true,
        'editLock.lockExpiry': { $lt: now }
      },
      {
        $set: {
          'editLock.isLocked': false,
          'editLock.lockedBy': undefined,
          'editLock.lockedById': undefined,
          'editLock.lockStartTime': undefined,
          'editLock.lockExpiry': undefined,
          'editLock.lockReason': undefined
        }
      }
    )
    
    if (result.modifiedCount > 0) {
      console.log(`자동 잠금 해제: ${result.modifiedCount}개 문서의 만료된 잠금 해제됨`)
    }
  } catch (error) {
    console.error('자동 잠금 해제 오류:', error)
  }
}

// GET - 위키 문서 검색/조회
export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    // 자동 잠금 해제 실행 (주기적으로 만료된 잠금 정리)
    await cleanupExpiredLocks()
    
    const { searchParams } = new URL(request.url)
    const title = searchParams.get('title')
    const slug = searchParams.get('slug')
    const search = searchParams.get('search')
    let namespace = searchParams.get('namespace')
    
    // 도움말 페이지는 help 네임스페이스에서 검색
    if (!namespace && (title === '도움말' || title === '이랑위키:도움말' || title?.includes('도움말'))) {
      namespace = 'help'
    }
    
    // 기본 네임스페이스
    if (!namespace) {
      namespace = 'main'
    }
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = parseInt(searchParams.get('skip') || '0')
    const sort = searchParams.get('sort') || 'title' // 'title', 'views', 'lastEdit'
    
    let query: any = {}
    
    // 네임스페이스 필터
    if (namespace) {
      query.namespace = namespace
    }
    
    // 삭제되지 않은 문서만
    query.isDeleted = { $ne: true }
    
    // 특정 문서 조회
    if (title) {
      console.log('위키 페이지 검색:', { title, namespace, query: { title, namespace, isDeleted: { $ne: true } } })
      
      // 먼저 정확한 제목으로 검색
      let page = await WikiPage.findOne({ 
        title: title, 
        namespace: namespace,
        isDeleted: { $ne: true }
      }).populate('creatorId', 'username displayName')
      
      console.log('제목 검색 결과:', page ? '찾음' : '없음')
      
      // 찾지 못했으면 슬러그로 검색
      if (!page) {
        page = await WikiPage.findOne({
          slug: title,
          namespace: namespace,
          isDeleted: { $ne: true }
        }).populate('creatorId', 'username displayName')
        console.log('슬러그 검색 결과:', page ? '찾음' : '없음')
      }
      // 여전히 못 찾으면 title을 규칙에 맞춰 슬러그화하여 검색
      if (!page) {
        const canonicalSlug = toSlug(title)
        if (canonicalSlug && canonicalSlug !== title) {
          page = await WikiPage.findOne({
            slug: canonicalSlug,
            namespace: namespace,
            isDeleted: { $ne: true }
          }).populate('creatorId', 'username displayName')
          console.log('정규화된 슬러그 검색 결과:', page ? '찾음' : '없음')
        }
      }
      
      // 여전히 찾지 못했으면 부분 매칭 시도 (도움말 관련 페이지)
      if (!page && (title === '도움말' || title.includes('도움말'))) {
        page = await WikiPage.findOne({
          $or: [
            { title: { $regex: '도움말', $options: 'i' } },
            { title: '이랑위키:도움말' }
          ],
          isDeleted: { $ne: true }
        }).populate('creatorId', 'username displayName')
        console.log('부분 매칭 검색 결과:', page ? '찾음' : '없음')
      }
      
      // 템플릿 네임스페이스 요청일 경우, 기본 템플릿을 동적으로 제공/자동 생성
      if (!page && (namespace === 'template' || (title && title.startsWith('템플릿:')))) {
        const templateType = (title || '').replace(/^템플릿:\s*/, '')
        const content = generateTemplateContent(templateType)
        if (content) {
          const autoCreate = ['1', 'true', 'yes'].includes((searchParams.get('autocreate') || '').toLowerCase())
          let createdPage = null as any
          if (autoCreate) {
            try {
              const slug = toSlug(title!)
              const tableOfContents = generateTableOfContents(content)
              const newPage = new WikiPage({
                title,
                slug,
                namespace: 'template',
                content,
                summary: '기본 템플릿',
                categories: ['템플릿', `템플릿/${templateType}`],
                tags: ['template'],
                creator: 'system',
                lastEditor: 'system',
                lastEditDate: new Date(),
                lastEditSummary: '자동 생성',
                currentRevision: 1,
                protection: { level: 'none' },
                isRedirect: false,
                isDeleted: false,
                isStub: false,
                isFeatured: false,
                views: 0,
                uniqueViews: 0,
                edits: 1,
                watchers: [],
                discussions: [],
                incomingLinks: [],
                outgoingLinks: extractLinks(content),
                tableOfContents,
                revisions: [{
                  pageId: undefined,
                  revisionNumber: 1,
                  content,
                  summary: '자동 생성',
                  author: 'system',
                  editType: 'create',
                  isMinorEdit: false,
                  isAutomated: true,
                  contentLength: content.length,
                  sizeChange: content.length,
                  isReverted: false,
                  isVerified: true,
                  timestamp: new Date()
                }]
              })
              createdPage = await newPage.save()
              page = createdPage
            } catch (e) {
              console.warn('템플릿 자동 생성 실패:', e)
            }
          }
          const templatePage = (page || {
            _id: 'template-temp',
            title: `템플릿:${templateType}`,
            slug: toSlug(`템플릿-${templateType}`),
            namespace: 'template',
            content,
            summary: '기본 템플릿',
            categories: ['템플릿', `템플릿/${templateType}`],
            tags: ['template'],
            creator: 'system',
            lastEditor: 'system',
            lastEditDate: new Date(),
            lastEditSummary: '자동 생성',
            currentRevision: 1,
            protection: { level: 'none' },
            isRedirect: false,
            redirectTarget: null,
            isStub: false,
            isFeatured: false,
            views: 0,
            uniqueViews: 0,
            edits: 1,
            tableOfContents: generateTableOfContents(content)
          })
          return NextResponse.json({
            success: true,
            page: {
              id: templatePage._id,
              title: templatePage.title,
              slug: templatePage.slug,
              namespace: templatePage.namespace,
              content: templatePage.content,
              summary: templatePage.summary,
              categories: templatePage.categories,
              tags: templatePage.tags,
              creator: templatePage.creator,
              creatorId: templatePage.creatorId,
              lastEditor: templatePage.lastEditor,
              lastEditorId: templatePage.lastEditorId,
              lastEditDate: templatePage.lastEditDate,
              lastEditSummary: templatePage.lastEditSummary,
              currentRevision: templatePage.currentRevision,
              protection: templatePage.protection,
              isRedirect: templatePage.isRedirect,
              redirectTarget: templatePage.redirectTarget,
              isStub: templatePage.isStub,
              isFeatured: templatePage.isFeatured,
              views: templatePage.views,
              uniqueViews: templatePage.uniqueViews,
              edits: templatePage.edits,
              tableOfContents: templatePage.tableOfContents,
              createdAt: templatePage.createdAt,
              updatedAt: templatePage.updatedAt
            }
          })
        }
      }
      
      // 모든 위키 페이지 목록 출력 (디버깅용)
      if (!page) {
        const allPages = await WikiPage.find({}).select('title slug namespace')
        console.log('전체 위키 페이지 목록:', allPages)
      }
      
      if (!page) {
        return NextResponse.json(
          { success: false, error: '문서를 찾을 수 없습니다.' },
          { status: 404 }
        )
      }
      
      // 조회수 증가
      page.views += 1
      page.uniqueViews += 1 // 실제로는 IP 기반으로 체크해야 함
      await page.save()
      
      return NextResponse.json({
        success: true,
        page: {
          id: page._id,
          title: page.title,
          slug: page.slug,
          namespace: page.namespace,
          content: page.content,
          summary: page.summary,
          categories: page.categories,
          tags: page.tags,
          creator: page.creator,
          creatorId: page.creatorId,
          lastEditor: page.lastEditor,
          lastEditorId: page.lastEditorId,
          lastEditDate: page.lastEditDate,
          lastEditSummary: page.lastEditSummary,
          currentRevision: page.currentRevision,
          protection: page.protection,
          isRedirect: page.isRedirect,
          redirectTarget: page.redirectTarget,
          isStub: page.isStub,
          isFeatured: page.isFeatured,
          views: page.views,
          uniqueViews: page.uniqueViews,
          edits: page.edits,
          tableOfContents: page.tableOfContents,
          createdAt: page.createdAt,
          updatedAt: page.updatedAt
        }
      })
    }
    
    // 슬러그로 조회
    if (slug) {
      query.slug = slug
    }
    
    // 검색어가 있으면 제목과 내용에서 검색
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ]
    }
    
    // 카테고리 필터
    if (category) {
      query.categories = { $in: [category] }
    }
    
    // 정렬 옵션
    let sortOptions: any = {}
    switch (sort) {
      case 'views':
        sortOptions.views = -1
        break
      case 'lastEdit':
        sortOptions.lastEditDate = -1
        break
      case 'created':
        sortOptions.createdAt = -1
        break
      default:
        sortOptions.title = 1
    }
    
    const pages = await WikiPage
      .find(query)
      .sort(sortOptions)
      .limit(limit)
      .skip(skip)
      .populate('creatorId', 'username displayName')
      .populate('lastEditorId', 'username displayName')
      .select('-content -revisions') // 목록에서는 내용과 리비전 제외
      .lean()
    
    const total = await WikiPage.countDocuments(query)
    
    return NextResponse.json({
      success: true,
      pages: pages.map(page => ({
        id: page._id,
        title: page.title,
        slug: page.slug,
        namespace: page.namespace,
        summary: page.summary,
        categories: page.categories,
        tags: page.tags,
        creator: page.creator,
        lastEditor: page.lastEditor,
        lastEditDate: page.lastEditDate,
        lastEditSummary: page.lastEditSummary,
        currentRevision: page.currentRevision,
        isRedirect: page.isRedirect,
        isStub: page.isStub,
        isFeatured: page.isFeatured,
        views: page.views,
        edits: page.edits,
        createdAt: page.createdAt,
        updatedAt: page.updatedAt
      })),
      pagination: {
        total,
        limit,
        skip,
        hasMore: skip + pages.length < total
      }
    })
    
  } catch (error) {
    console.error('위키 문서 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '문서 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 템플릿 생성기
function generateTemplateContent(typeRaw?: string): string | null {
  const type = (typeRaw || '').trim()
  const is = (names: string[]) => names.includes(type)

  const person = `[[인포박스: 제목= | 이미지= | 본명= | 출생= | 국적= | 신체= | 가족= | 학력= | 소속= | 직업= | 데뷔= | 링크= ]]

== 개요 ==

== 활동 ==

== 작품 목록 ==
[[카드그리드: items=[{"title":"","image":""}]]]

== 여담 ==
`

  const school = `[[인포박스: 제목= | 이미지= | 설립= | 유형= | 소재지= | 규모= | 교장= | 홈페이지= ]]

== 개요 ==

== 연혁 ==

== 학과 및 교육과정 ==

== 동문 ==
`

  const game = `[[인포박스: 제목= | 이미지= | 개발= | 유통= | 플랫폼= | 장르= | 출시= | 엔진= | 한국어 지원= | 등급= ]]

== 개요 ==

== 시스템 요구 사항 ==
||<table align=center><table bordercolor=#dddddd,#2d2f34><table bgcolor=transparent><rowbgcolor=#dddddd,#2d2f34><rowcolor=#000000,#e0e0e0> '''구분''' || '''최소 사양''' || '''권장 사양''' ||
|| '''운영 체제''' ||  ||  ||
|| '''CPU''' ||  ||  ||
|| '''RAM''' ||  ||  ||
|| '''그래픽카드''' ||  ||  ||
|| '''API''' ||  ||  ||
|| '''저장 공간''' ||  ||  ||

== 특징 ==

== 평가 ==

== 관련 문서 ==
`

  const music = `[[인포박스: 제목= | 이미지= | 아티스트= | 발매일= | 장르= | 레이블= | 제작= | 트랙리스트= ]]

== 개요 ==

== 수록곡 ==
[[카드그리드: items=[{"title":"","image":""}]]]

== 성과 ==

== 관련 문서 ==
`

  const research = `[[인포박스: 제목= | 이미지= | 분야= | 연구자= | 소속= | 키워드= | 링크= ]]

== 개요 ==

== 배경 ==

== 방법 ==

== 결과 ==

== 결론 및 향후 과제 ==
`

  const chemistry = `[[인포박스: 제목= | 이미지= | 관계= | 기간= | 에피소드= | 링크= ]]

== 개요 ==

== 관계 ==

== 에피소드 ==
`

  const dev = `[[인포박스: 제목= | 이미지= | 언어= | 프레임워크= | 리포지토리= | 배포= | 라이선스= ]]

== 개요 ==

== 설치 ==

== 사용법 ==

== 구조 ==
`

  const cabinet = `[[인포박스: 제목= | 이미지= | 임기= | 소속= | 구성= | 링크= ]]

== 개요 ==

== 구성 ==
[[카드그리드: items=[{"title":"","image":""}]]]

== 활동 ==
`

  const sports = `[[인포박스: 제목= | 이미지= | 종목= | 소속팀= | 포지션= | 기록= | 링크= ]]

== 개요 ==

== 경력 ==

== 기록 ==
`

  const company = `[[인포박스: 제목= | 이미지= | 설립= | 창립자= | 본사= | 산업= | 주요 제품= | 매출= | 임직원= | 웹사이트= ]]

== 개요 ==

== 연혁 ==

== 사업 ==

== 조직 ==
`

  const map: Record<string, string> = {
    '인물': person, '사람': person,
    '학교': school,
    '게임': game,
    '음악': music,
    '연구': research,
    '케미': chemistry,
    '개발': dev, '코딩': dev,
    '내각': cabinet,
    '스포츠': sports, '운동': sports,
    '기업': company, '회사': company, '팀': company
  }
  return map[type] || null
}

// POST - 새 위키 문서 생성
export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const user = await getUserFromToken(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }
    
    if (!user.permissions.canEdit) {
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
      isMinorEdit
    } = await request.json()
    
    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: '제목과 내용은 필수입니다.' },
        { status: 400 }
      )
    }

    // 레이트리밋 (로그인 사용자 기준) + CAPTCHA 유도
    const rateKey = `edit:${user._id.toString()}`
    if (isRateLimited(rateKey, 10) && !hasValidCaptchaPass(request)) {
      const { token, question } = createCaptchaChallenge()
      return NextResponse.json(
        { success: false, error: '편집이 일시적으로 제한되었습니다. CAPTCHA를 완료하세요.', captcha: { token, question } },
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

    // 슬러그 생성 (규칙 통일)
    const slug = toSlug(title)
    
    // 중복 제목 검사
    const existingPage = await WikiPage.findOne({
      $or: [
        { title: title },
        { slug: slug }
      ],
      namespace: namespace,
      isDeleted: { $ne: true }
    })
    
    if (existingPage) {
      return NextResponse.json(
        { success: false, error: '이미 존재하는 문서 제목입니다.' },
        { status: 409 }
      )
    }
    
    // 목차 생성 (간단한 헤딩 추출)
    const tableOfContents = generateTableOfContents(content)
    
    // 일반 사용자는 승인 대기 큐로 보냄 (운영자/관리자는 즉시 반영)
    const isOperator = isModeratorOrAbove(user as any) || user.role === 'admin' || user.role === 'owner'
    if (!isOperator) {
      const submission = await WikiSubmission.create({
        type: 'create',
        namespace,
        targetTitle: title,
        targetSlug: slug,
        pageId: null,
        content,
        summary,
        editSummary,
        categories,
        tags,
        expectedRevision: 0,
        author: user.username,
        authorId: user._id
      })
      return NextResponse.json({ success: true, pending: true, message: '승인 대기 중입니다.', submissionId: submission._id })
    }

    // 운영자 이상은 즉시 생성
    const newPage = new WikiPage({
      title,
      slug,
      namespace,
      content,
      summary,
      categories,
      tags,
      creator: user.username,
      creatorId: user._id,
      lastEditor: user.username,
      lastEditorId: user._id,
      lastEditDate: new Date(),
      lastEditSummary: editSummary || '문서 생성',
      currentRevision: 1,
      protection: { level: 'none' },
      isRedirect,
      redirectTarget: isRedirect ? redirectTarget : undefined,
      isDeleted: false,
      isStub: content.length < 500,
      isFeatured: false,
      views: 0,
      uniqueViews: 0,
      edits: 1,
      watchers: [user._id],
      discussions: [],
      incomingLinks: [],
      outgoingLinks: extractLinks(content),
      tableOfContents
    })
    const firstRevision = {
      pageId: newPage._id,
      revisionNumber: 1,
      content,
      summary: editSummary || '문서 생성',
      author: user.username,
      authorId: user._id,
      editType: 'create',
      isMinorEdit: Boolean(isMinorEdit),
      isAutomated: false,
      contentLength: content.length,
      sizeChange: content.length,
      isReverted: false,
      isVerified: false,
      timestamp: new Date()
    }
    newPage.revisions = [firstRevision]
    const savedPage = await newPage.save()
    user.edits += 1
    user.pagesCreated += 1
    user.lastActivity = new Date()
    await user.save()
    
    // Send Discord webhook notification for document creation
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
      // Webhook 실패는 문서 생성을 방해하지 않음
    }
    
    appendAuditLog({ actor: user.username, action: 'page.create', meta: { title } })
    return NextResponse.json({ success: true, message: '문서가 성공적으로 생성되었습니다.', page: { id: savedPage._id, title: savedPage.title, slug: savedPage.slug, namespace: savedPage.namespace } })
    
  } catch (error) {
    console.error('위키 문서 생성 오류:', error)
    return NextResponse.json(
      { success: false, error: '문서 생성 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 목차 생성 함수
function generateTableOfContents(content: string) {
  const headings: Array<{ level: number; title: string; anchor: string }> = []
  const lines = content.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    let level = 0
    let title = ''

    // 나무위키 스타일 헤딩 (= 제목 =)
    const namuMatch = trimmed.match(/^(=+)\s*(.+?)\s*=+$/)
    if (namuMatch) {
      level = namuMatch[1].length
      title = namuMatch[2].trim()
    } else if (trimmed.startsWith('#')) {
      // 마크다운 헤딩 (# 제목)
      const mdMatch = trimmed.match(/^(#+)\s*(.+)$/)
      if (mdMatch) {
        level = mdMatch[1].length
        title = mdMatch[2].trim()
      }
    }

    if (level > 0 && title) {
      const anchor = toSlug(title)
      headings.push({ level, title, anchor })
    }
  }

  return headings
}

// PUT - 기존 위키 문서 업데이트
export async function PUT(request: NextRequest) {
  try {
    await dbConnect()
    
    const user = await getUserFromToken(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }
    
    if (!user.permissions.canEdit) {
      return NextResponse.json(
        { success: false, error: '문서 편집 권한이 없습니다.' },
        { status: 403 }
      )
    }
    
    const {
      title,
      content,
      summary,
      editSummary,
      expectedRevision // 클라이언트가 보고 있던 리비전(충돌 감지용)
    } = await request.json()
    
    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: '제목과 내용은 필수입니다.' },
        { status: 400 }
      )
    }
    
    // 기존 문서 찾기
    const existingPage = await WikiPage.findOne({
      $or: [
        { title: title },
        { slug: title }
      ],
      isDeleted: { $ne: true }
    })
    
    if (!existingPage) {
      return NextResponse.json(
        { success: false, error: '업데이트할 문서를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    // 보호 정책에 따른 편집 허용 여부 확인
    if (!canEditPage(user as any, existingPage as any)) {
      return NextResponse.json(
        { success: false, error: '보호된 문서이므로 현재 권한으로는 편집할 수 없습니다.' },
        { status: 403 }
      )
    }

    // 레이트리밋 (로그인 사용자 기준) + CAPTCHA 유도
    const rateKey = `edit:${user._id.toString()}`
    if (isRateLimited(rateKey, 10) && !hasValidCaptchaPass(request)) {
      const { token, question } = createCaptchaChallenge()
      return NextResponse.json(
        { success: false, error: '편집이 일시적으로 제한되었습니다. CAPTCHA를 완료하세요.', captcha: { token, question } },
        { status: 429 }
      )
    }
    
    // 편집 충돌 감지: 클라이언트가 보던 리비전이 최신이 아닐 경우 거부
    if (typeof expectedRevision === 'number' && existingPage.currentRevision !== expectedRevision) {
      return NextResponse.json(
        { success: false, error: '편집 충돌이 발생했습니다. 최신 내용을 반영한 후 다시 시도하세요.', conflict: { currentRevision: existingPage.currentRevision } },
        { status: 409 }
      )
    }

    // 일반 사용자는 승인 대기 큐로 보냄 (운영자/관리자는 즉시 반영)
    const isOperator = isModeratorOrAbove(user as any) || user.role === 'admin' || user.role === 'owner'
    if (!isOperator) {
      await WikiSubmission.create({
        type: 'edit',
        namespace: existingPage.namespace,
        targetTitle: existingPage.title,
        targetSlug: existingPage.slug,
        pageId: existingPage._id,
        content,
        summary,
        editSummary,
        categories: existingPage.categories,
        tags: existingPage.tags,
        expectedRevision,
        author: user.username,
        authorId: user._id
      })
      return NextResponse.json({ success: true, pending: true, message: '승인 대기 중입니다.' })
    }

    // 목차 생성
    const tableOfContents = generateTableOfContents(content)
    
    // 새 리비전 생성
    const newRevision = {
      pageId: existingPage._id,
      revisionNumber: existingPage.currentRevision + 1,
      content,
      summary: editSummary || '문서 편집',
      author: user.username,
      authorId: user._id,
      editType: 'edit',
      isMinorEdit: false,
      isAutomated: false,
      contentLength: content.length,
      sizeChange: content.length - existingPage.content.length,
      isReverted: false,
      isVerified: false,
      timestamp: new Date()
    }
    
    // 문서 업데이트
    existingPage.content = content
    existingPage.summary = summary
    existingPage.lastEditor = user.username
    existingPage.lastEditorId = user._id
    existingPage.lastEditDate = new Date()
    existingPage.lastEditSummary = editSummary || '문서 편집'
    existingPage.currentRevision += 1
    existingPage.edits += 1
    existingPage.revisions.push(newRevision as any)
    existingPage.outgoingLinks = extractLinks(content)
    existingPage.tableOfContents = tableOfContents
    existingPage.isStub = content.length < 500
    
    await existingPage.save()
    
    // 사용자 통계 업데이트
    user.edits += 1
    user.lastActivity = new Date()
    await user.save()
    
    // Send Discord webhook notification for document edit
    try {
      const contentChange = `리비전 ${existingPage.currentRevision}로 업데이트\n차이: ${newRevision.sizeChange > 0 ? '+' : ''}${newRevision.sizeChange}바이트`
      await DiscordWebhookService.sendDocumentEdit(
        user.username,
        title,
        editSummary || '문서 편집',
        contentChange
      )
    } catch (webhookError) {
      console.error('Discord webhook 전송 실패:', webhookError)
      // Webhook 실패는 문서 편집을 방해하지 않음
    }
    
    const response = NextResponse.json({
      success: true,
      message: '문서가 성공적으로 업데이트되었습니다.',
      page: {
        id: existingPage._id,
        title: existingPage.title,
        slug: existingPage.slug,
        namespace: existingPage.namespace
      }
    })
    appendAuditLog({ actor: user.username, action: 'page.update', meta: { title } })
    return response
    
  } catch (error) {
    console.error('위키 문서 업데이트 오류:', error)
    return NextResponse.json(
      { success: false, error: '문서 업데이트 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// 링크 추출 함수
function extractLinks(content: string): string[] {
  const links: string[] = []
  
  // [[링크]] 형태의 내부 링크 추출
  const internalLinkRegex = /\[\[([^\]]+)\]\]/g
  let match
  
  while ((match = internalLinkRegex.exec(content)) !== null) {
    const linkTarget = match[1].split('|')[0].trim() // 파이프로 분리된 경우 첫 번째 부분
    if (linkTarget && !links.includes(linkTarget)) {
      links.push(linkTarget)
    }
  }
  
  return links
} 