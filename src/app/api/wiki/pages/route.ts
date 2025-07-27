import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import dbConnect from '@/lib/mongodb'
import { WikiPage, WikiUser } from '@/models/Wiki'

const JWT_SECRET = process.env.JWT_SECRET || 'rangu-wiki-secret'

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

// GET - 위키 문서 검색/조회
export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
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
      editSummary
    } = await request.json()
    
    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: '제목과 내용은 필수입니다.' },
        { status: 400 }
      )
    }
    
    // 슬러그 생성
    const slug = title.toLowerCase()
      .replace(/[^\w\s가-힣]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
    
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
    
    // 새 문서 생성
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
      protection: {
        level: 'none'
      },
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
    
    // 첫 번째 리비전 생성
    const firstRevision = {
      pageId: newPage._id,
      revisionNumber: 1,
      content,
      summary: editSummary || '문서 생성',
      author: user.username,
      authorId: user._id,
      editType: 'create',
      isMinorEdit: false,
      isAutomated: false,
      contentLength: content.length,
      sizeChange: content.length,
      isReverted: false,
      isVerified: false,
      timestamp: new Date()
    }
    
    newPage.revisions = [firstRevision]
    const savedPage = await newPage.save()
    
    // 사용자 통계 업데이트
    user.edits += 1
    user.pagesCreated += 1
    user.lastActivity = new Date()
    await user.save()
    
    return NextResponse.json({
      success: true,
      message: '문서가 성공적으로 생성되었습니다.',
      page: {
        id: savedPage._id,
        title: savedPage.title,
        slug: savedPage.slug,
        namespace: savedPage.namespace
      }
    })
    
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
  const headings = []
  const lines = content.split('\n')
  
  for (const line of lines) {
    const trimmed = line.trim()
    let level = 0
    let title = ''
    
    // 마크다운 헤딩 감지
    if (trimmed.startsWith('#')) {
      const match = trimmed.match(/^(#+)\s*(.+)$/)
      if (match) {
        level = match[1].length
        title = match[2].trim()
      }
    }
    
    if (level > 0 && title) {
      const anchor = title.toLowerCase()
        .replace(/[^\w\s가-힣]/g, '')
        .replace(/\s+/g, '-')
      
      headings.push({
        level,
        title,
        anchor
      })
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
      editSummary
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
    
    return NextResponse.json({
      success: true,
      message: '문서가 성공적으로 업데이트되었습니다.',
      page: {
        id: existingPage._id,
        title: existingPage.title,
        slug: existingPage.slug,
        namespace: existingPage.namespace
      }
    })
    
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