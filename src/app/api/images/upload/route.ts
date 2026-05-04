import { getRequiredEnv } from '@/lib/env'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { eq } from 'drizzle-orm'
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
  const token = request.cookies.get('wiki-token')?.value
  if (!token) return null
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    const db = getDb()
    const rows = await db
      .select({ id: wikiUsers.id, username: wikiUsers.username })
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
    const uniqueFilename = `${randomUUID()}.${fileExtension}`

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
        isPublic: true,
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
    })
  } catch (error) {
    console.error('이미지 업로드 오류:', error)
    return NextResponse.json(
      { success: false, error: '이미지 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}
