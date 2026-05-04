import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs/promises'
import mime from 'mime-types'
import path from 'path'
import { eq } from 'drizzle-orm'
import { serveMediaByPath } from '@/lib/serveMediaByPath'
import { getDb } from '@/db/client'
import { images } from '@/db/schema/media'
import { resolveWikiUploadPath } from '@/lib/wikiUploadStorage'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const segments = params.path || []

  const localFileResponse = await tryServeLocalWikiFile(segments)
  if (localFileResponse) {
    return localFileResponse
  }

  const mediaResponse = await serveMediaByPath('uploads/wiki', segments, request)

  // Legacy/compat fallback: wiki uploads can also live in the Image collection.
  if (mediaResponse.status !== 404) {
    return mediaResponse
  }

  const lastSegment = segments[segments.length - 1]
  if (!lastSegment) {
    return mediaResponse
  }

  const decodedFilename = decodeFilename(lastSegment)
  if (!decodedFilename) {
    return mediaResponse
  }

  try {
    const db = getDb()
    const [imageDoc] = await db
      .select({
        mimeType: images.mimeType,
        data: images.data,
        originalName: images.originalName,
      })
      .from(images)
      .where(eq(images.filename, decodedFilename))
      .limit(1)

    if (!imageDoc) {
      return mediaResponse
    }

    const imageBuffer = Buffer.from(imageDoc.data, 'base64')

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': imageDoc.mimeType,
        'Content-Length': imageBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': `inline; filename="${imageDoc.originalName || decodedFilename}"`,
      },
    })
  } catch (error) {
    console.error('Failed to serve legacy wiki image:', error)
    return mediaResponse
  }
}

function decodeFilename(value: string) {
  try {
    const decoded = decodeURIComponent(value).trim()
    if (!decoded || decoded.includes('/') || decoded.includes('\\') || decoded.includes('..')) {
      return null
    }
    return decoded
  } catch {
    return null
  }
}

async function tryServeLocalWikiFile(segments: string[]) {
  const filePath = resolveWikiUploadPath(segments)
  if (!filePath) {
    return null
  }

  try {
    const fileStat = await fs.stat(filePath)
    if (!fileStat.isFile()) {
      return null
    }

    const fileBuffer = await fs.readFile(filePath)
    const mimeType = mime.lookup(filePath) || 'application/octet-stream'
    const originalName = path.basename(filePath)

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': String(mimeType),
        'Content-Length': fileBuffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': `inline; filename="${originalName}"`,
      },
    })
  } catch {
    return null
  }
}
