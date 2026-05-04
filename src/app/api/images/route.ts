import { getRequiredEnv } from '@/lib/env'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { and, desc, eq, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { images } from '@/db/schema/media'
import { wikiUsers } from '@/db/schema/wiki'
import jwt from 'jsonwebtoken'

export const dynamic = 'force-dynamic'

const JWT_SECRET = getRequiredEnv('JWT_SECRET')
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]

async function getUserFromToken(request: NextRequest) {
  let token = request.cookies.get('wiki-token')?.value
  if (!token) {
    const authHeader = request.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7)
    }
  }
  if (!token) return null

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    const db = getDb()
    const rows = await db
      .select({
        id: wikiUsers.id,
        username: wikiUsers.username,
      })
      .from(wikiUsers)
      .where(eq(wikiUsers.id, decoded.userId))
      .limit(1)
    return rows[0] ?? null
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
    const category = (form.get('category') as string) || 'general'
    const description = form.get('description') as string
    const isPublic = form.get('isPublic') === 'true'

    if (!file) {
      return NextResponse.json(
        { success: false, error: '파일이 필요합니다.' },
        { status: 400 }
      )
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: '허용되지 않는 파일 형식입니다. (JPG, PNG, GIF, WebP, SVG만 허용)' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { success: false, error: '파일이 너무 큽니다. 최대 5MB까지 허용됩니다.' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const base64Data = buffer.toString('base64')

    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const uniqueFilename = `${category}_${randomUUID()}.${fileExtension}`

    const db = getDb()
    const [created] = await db
      .insert(images)
      .values({
        filename: uniqueFilename,
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        data: base64Data,
        uploadedBy: user.username,
        uploadedById: user.id,
        category,
        description: description || undefined,
        isPublic,
      })
      .returning({ id: images.id })

    const imageUrl = `/api/images/serve/${uniqueFilename}`

    return NextResponse.json({
      success: true,
      url: imageUrl,
      id: created.id,
      filename: uniqueFilename,
      originalName: file.name,
      size: file.size,
      mimeType: file.type,
      category,
      message: '이미지가 성공적으로 업로드되었습니다.',
    })
  } catch (error) {
    console.error('이미지 업로드 오류:', error)
    return NextResponse.json(
      { success: false, error: '이미지 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

// GET endpoint to list user's images
export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json(
        { success: false, error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const whereParts = [eq(images.uploadedById, user.id)]
    if (category && category !== 'all') {
      whereParts.push(eq(images.category, category))
    }
    const whereClause = whereParts.length === 1 ? whereParts[0] : and(...whereParts)

    const db = getDb()
    const rows = await db
      .select({
        _id: images.id,
        filename: images.filename,
        originalName: images.originalName,
        mimeType: images.mimeType,
        size: images.size,
        uploadedBy: images.uploadedBy,
        uploadedById: images.uploadedById,
        category: images.category,
        description: images.description,
        isPublic: images.isPublic,
        createdAt: images.createdAt,
        updatedAt: images.updatedAt,
      })
      .from(images)
      .where(whereClause)
      .orderBy(desc(images.createdAt))
      .offset(skip)
      .limit(limit)

    const [{ count: total }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(images)
      .where(whereClause)

    const imagesWithUrls = rows.map((img) => ({
      ...img,
      url: `/api/images/serve/${img.filename}`,
    }))

    return NextResponse.json({
      success: true,
      images: imagesWithUrls,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('이미지 목록 조회 오류:', error)
    return NextResponse.json(
      { success: false, error: '이미지 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
