import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { images } from '@/db/schema/media'
import { wikiAds } from '@/db/schema/wiki'
import { checkAdminAuth } from '@/lib/adminAuth'
import { validateAdInput } from '@/lib/adRules'

export const dynamic = 'force-dynamic'

const FORBIDDEN = { success: false, error: '관리자 권한이 필요합니다.' }
const NOT_FOUND = { success: false, error: '광고를 찾을 수 없습니다.' }
const UPLOAD_PREFIX = '/api/images/serve/ad-'

async function deleteUploadedImages(paths: string[]) {
  for (const path of paths) {
    if (path.startsWith(UPLOAD_PREFIX)) {
      await getDb().delete(images).where(eq(images.filename, path.slice('/api/images/serve/'.length)))
    }
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await checkAdminAuth(request))) return NextResponse.json(FORBIDDEN, { status: 403 })
  const body = await request.json().catch(() => null)
  const db = getDb()
  const [current] = await db.select().from(wikiAds).where(eq(wikiAds.id, params.id)).limit(1)
  if (!current) return NextResponse.json(NOT_FOUND, { status: 404 })

  const check = validateAdInput({ ...current, ...body })
  if (!check.ok) return NextResponse.json({ success: false, error: check.error }, { status: 400 })
  const sortOrder = Number.isInteger(body?.sortOrder) ? body.sortOrder : current.sortOrder

  const [ad] = await db
    .update(wikiAds)
    .set({ ...check.value, sortOrder, updatedAt: new Date() })
    .where(eq(wikiAds.id, params.id))
    .returning()

  await deleteUploadedImages(
    [current.desktopImage, current.mobileImage].filter((path) => path !== ad.desktopImage && path !== ad.mobileImage)
  )
  return NextResponse.json({ success: true, ad })
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  if (!(await checkAdminAuth(request))) return NextResponse.json(FORBIDDEN, { status: 403 })
  const [deleted] = await getDb().delete(wikiAds).where(eq(wikiAds.id, params.id)).returning()
  if (!deleted) return NextResponse.json(NOT_FOUND, { status: 404 })
  await deleteUploadedImages([deleted.desktopImage, deleted.mobileImage])
  return NextResponse.json({ success: true })
}
