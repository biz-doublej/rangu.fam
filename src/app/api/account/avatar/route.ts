import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import sharp from 'sharp'
import { getDb } from '@/db/client'
import { images } from '@/db/schema/media'
import { wikiUsers } from '@/db/schema/wiki'
import { getAuthenticatedWikiUser } from '@/lib/doublejAuth'

export const dynamic = 'force-dynamic'

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp'])
const AVATAR_URL_PREFIX = '/api/images/serve/'

function uploadedFilename(avatar: string | null | undefined): string | null {
  if (!avatar?.startsWith(`${AVATAR_URL_PREFIX}avatar-`)) return null
  return avatar.slice(AVATAR_URL_PREFIX.length)
}

async function deleteUploadedAvatar(avatar: string | null | undefined) {
  const filename = uploadedFilename(avatar)
  if (filename) await getDb().delete(images).where(eq(images.filename, filename))
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedWikiUser(request)
  if (!user) {
    return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: '이미지 파일을 선택해 주세요.' }, { status: 400 })
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ success: false, error: '이미지는 5MB 이하만 올릴 수 있습니다.' }, { status: 413 })
  }

  let output: Buffer
  try {
    const input = Buffer.from(await file.arrayBuffer())
    const { format } = await sharp(input).metadata()
    if (!format || !ALLOWED_FORMATS.has(format)) {
      return NextResponse.json({ success: false, error: 'JPG, PNG, WebP 이미지만 올릴 수 있습니다.' }, { status: 415 })
    }
    output = await sharp(input).rotate().resize(256, 256, { fit: 'cover' }).webp({ quality: 80 }).toBuffer()
  } catch {
    return NextResponse.json({ success: false, error: '이미지를 처리하지 못했습니다.' }, { status: 400 })
  }

  const db = getDb()
  const filename = `avatar-${user.id}-${Date.now()}.webp`
  await db.insert(images).values({
    filename,
    originalName: filename,
    mimeType: 'image/webp',
    size: output.length,
    data: output.toString('base64'),
    uploadedBy: user.username,
    uploadedById: user.id,
    category: 'profile',
    isPublic: true,
  })

  const avatar = `${AVATAR_URL_PREFIX}${filename}`
  await db.update(wikiUsers).set({ avatar, updatedAt: new Date() }).where(eq(wikiUsers.id, user.id))
  await deleteUploadedAvatar(user.avatar)

  return NextResponse.json({ success: true, avatar })
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedWikiUser(request)
  if (!user) {
    return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 })
  }

  await getDb().update(wikiUsers).set({ avatar: null, updatedAt: new Date() }).where(eq(wikiUsers.id, user.id))
  await deleteUploadedAvatar(user.avatar)
  return NextResponse.json({ success: true, avatar: null })
}
