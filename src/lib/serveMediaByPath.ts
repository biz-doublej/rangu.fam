import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'stream'
import { Types } from 'mongoose'
import dbConnect from '@/lib/mongodb'
import { getMediaBucket } from '@/lib/gridfs'
import MediaAsset from '@/models/MediaAsset'

type LeanMediaAsset = {
  _id: Types.ObjectId | string
  originalPath: string
  filename: string
  mimeType: string
  size: number
  category: string
  gridFsId: Types.ObjectId
}

function toWebReadable(stream: NodeJS.ReadableStream) {
  // Node 18 provides Readable.toWeb but fallback just in case
  if (typeof (Readable as any).toWeb === 'function') {
    return (Readable as any).toWeb(stream) as ReadableStream<Uint8Array>
  }

  return new ReadableStream({
    start(controller) {
      stream.on('data', chunk => controller.enqueue(chunk))
      stream.on('end', () => controller.close())
      stream.on('error', err => controller.error(err))
    },
    cancel() {
      if (typeof (stream as any).destroy === 'function') {
        ;(stream as any).destroy()
      }
    },
  })
}

function sanitizeSegments(segments: string[]) {
  return segments
    .map(segment => decodeURIComponent(segment).replace(/\\/g, '/'))
    .filter(segment => segment && !segment.includes('..'))
}

export async function serveMediaByPath(prefix: string, segments: string[], request: NextRequest) {
  try {
    const safeSegments = sanitizeSegments(segments)
    const relativePath = safeSegments.join('/')
    const originalPath = [prefix, relativePath].filter(Boolean).join('/')

    await dbConnect()

    const asset = await MediaAsset.findOne({ originalPath }).lean<LeanMediaAsset>()
    if (!asset) {
      return NextResponse.json({ error: 'Media not found', path: originalPath }, { status: 404 })
    }

    const bucket = getMediaBucket()
    const rangeHeader = request.headers.get('range')

    if (rangeHeader) {
      const bytesPrefix = 'bytes='
      if (!rangeHeader.startsWith(bytesPrefix)) {
        return new NextResponse(null, { status: 416 })
      }

      const rangeParts = rangeHeader.replace(bytesPrefix, '').split('-')
      const start = parseInt(rangeParts[0], 10)
      const end = rangeParts[1] ? parseInt(rangeParts[1], 10) : asset.size - 1

      if (isNaN(start) || isNaN(end) || start >= asset.size || end >= asset.size || start > end) {
        return new NextResponse(null, { status: 416 })
      }

      const downloadStream = bucket.openDownloadStream(asset.gridFsId, {
        start,
        end: end + 1,
      })

      const chunkSize = end - start + 1
      const responseStream = toWebReadable(downloadStream)

      return new NextResponse(responseStream, {
        status: 206,
        headers: {
          'Content-Type': asset.mimeType,
          'Content-Length': chunkSize.toString(),
          'Content-Range': `bytes ${start}-${end}/${asset.size}`,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      })
    }

    const downloadStream = bucket.openDownloadStream(asset.gridFsId)
    const responseStream = toWebReadable(downloadStream)

    return new NextResponse(responseStream, {
      status: 200,
      headers: {
        'Content-Type': asset.mimeType,
        'Content-Length': asset.size.toString(),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('Failed to serve media asset:', error)
    return NextResponse.json({ error: 'Failed to load media asset' }, { status: 500 })
  }
}
