import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import { getDb } from '@/db/client'
import { images } from '@/db/schema/media'
import { checkAdminAuth } from '@/lib/adminAuth'

export const dynamic = 'force-dynamic'

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp'])
const WIDTHS = { desktop: 1600, mobile: 900 } as const

/** 광고 이미지를 WebP 로 줄여 images 표에 저장하고 주소를 돌려준다. */
export async function POST(request: NextRequest) {
  const admin = await checkAdminAuth(request)
  if (!admin) return NextResponse.json({ success: false, error: '관리자 권한이 필요합니다.' }, { status: 403 })

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  const kind = form?.get('kind') === 'mobile' ? 'mobile' : 'desktop'
  if (!(file instanceof File)) {
    return NextResponse.json({ success: false, error: '이미지 파일을 선택해 주세요.' }, { status: 400 })
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ success: false, error: '이미지는 8MB 이하만 올릴 수 있습니다.' }, { status: 413 })
  }

  let output: Buffer
  try {
    const input = Buffer.from(await file.arrayBuffer())
    const { format } = await sharp(input).metadata()
    if (!format || !ALLOWED_FORMATS.has(format)) {
      return NextResponse.json({ success: false, error: 'JPG, PNG, WebP 이미지만 올릴 수 있습니다.' }, { status: 415 })
    }
    output = await sharp(input)
      .rotate()
      .flatten({ background: '#0a0a0c' })
      .resize({ width: WIDTHS[kind], withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer()
  } catch {
    return NextResponse.json({ success: false, error: '이미지를 처리하지 못했습니다.' }, { status: 400 })
  }

  const filename = `ad-${kind}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.webp`
  await getDb().insert(images).values({
    filename,
    originalName: filename,
    mimeType: 'image/webp',
    size: output.length,
    data: output.toString('base64'),
    uploadedBy: admin.username,
    uploadedById: admin.userId,
    category: 'ad',
    isPublic: true,
  })

  return NextResponse.json({ success: true, url: `/api/images/serve/${filename}` })
}
