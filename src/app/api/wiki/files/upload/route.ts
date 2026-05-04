import { getRequiredEnv } from '@/lib/env'
import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'crypto'
import jwt from 'jsonwebtoken'
import { getDb } from '@/db/client'
import { images } from '@/db/schema/media'
import { wikiUsers } from '@/db/schema/wiki'
import { enforceUserAccessPolicy } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

const JWT_SECRET = getRequiredEnv('JWT_SECRET')
const MAX_SIZE_BYTES = 1 * 1024 * 1024 // 1MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]

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

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const form = await request.formData()
    const file = form.get('file') as File
    if (!file) {
      return NextResponse.json(
        { success: false, error: '파일이 필요합니다.' },
        { status: 400 }
      )
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: '허용되지 않는 파일 형식입니다. (JPG, PNG, GIF, WebP, SVG만 허용)',
        },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: '파일이 너무 큽니다. 최대 1MB까지 허용됩니다.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const base64Data = buffer.toString('base64')

    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const uniqueFilename = `wiki_${randomUUID()}.${fileExtension}`

    // Cloud Run은 ephemeral disk → DB(images) 저장 + /api/images/serve/{filename} 으로 서빙
    const db = getDb()
    await db.insert(images).values({
      filename: uniqueFilename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      data: base64Data,
      uploadedBy: user.username,
      uploadedById: user.id,
      category: 'wiki',
      isPublic: true,
    })

    // legacy 호환 경로(/uploads/wiki/...) 와 신규 경로(/api/images/serve/...) 모두 동작:
    // wiki uploads 라우트가 fallback 으로 images 테이블을 조회 (이미 마이그레이션됨)
    return NextResponse.json({
      success: true,
      url: `/api/images/serve/${uniqueFilename}`,
      name: file.name,
      size: file.size,
      type: `.${fileExtension}`,
    })
  } catch (error) {
    console.error('위키 파일 업로드 오류:', error)
    return NextResponse.json(
      { success: false, error: '파일 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
