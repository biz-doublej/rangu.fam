import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { images } from '@/db/schema/media'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const db = getDb()

    const { filename } = params

    const [imageDoc] = await db
      .select()
      .from(images)
      .where(eq(images.filename, filename))
      .limit(1)

    if (!imageDoc) {
      return NextResponse.json({ error: '이미지를 찾을 수 없습니다.' }, { status: 404 })
    }

    const imageBuffer = Buffer.from(imageDoc.data, 'base64')

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': imageDoc.mimeType,
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': `inline; filename="${imageDoc.originalName}"`,
      },
    })
  } catch (error) {
    console.error('이미지 서빙 오류:', error)
    return NextResponse.json({ error: '이미지를 로드할 수 없습니다.' }, { status: 500 })
  }
}
