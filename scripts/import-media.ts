import fs from 'fs'
import path from 'path'
import { createHash } from 'crypto'
import mime from 'mime-types'
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import MediaAsset, { MediaCategory } from '@/models/MediaAsset'
import SpotlightSlide from '@/models/SpotlightSlide'
import { getMediaBucket, resetMediaBucket } from '@/lib/gridfs'

interface SourceConfig {
  label: string
  dir: string
  prefix: string
  category: MediaCategory
}

const ROOT_DIR = process.cwd()
dotenv.config({ path: path.join(ROOT_DIR, '.env.local') })

const SOURCES: SourceConfig[] = [
  {
    label: 'home images',
    dir: path.join(ROOT_DIR, 'public/images'),
    prefix: 'images',
    category: 'image',
  },
  {
    label: 'home videos',
    dir: path.join(ROOT_DIR, 'public/videos'),
    prefix: 'videos',
    category: 'video',
  },
  {
    label: 'wiki uploads',
    dir: path.join(ROOT_DIR, 'public/uploads/wiki'),
    prefix: 'uploads/wiki',
    category: 'wiki',
  },
]

const DEFAULT_SPOTLIGHT: Array<{
  title: string
  type: 'image' | 'video'
  srcPath: string
  posterPath?: string
  order: number
  durationSeconds: number
}> = [
  { title: '추억의 사진 1', type: 'image' as const, srcPath: 'images/slide1.jpg', order: 1, durationSeconds: 5 },
  { title: '추억의 사진 2', type: 'image' as const, srcPath: 'images/slide2.jpg', order: 2, durationSeconds: 5 },
  { title: '추억의 사진 3', type: 'image' as const, srcPath: 'images/slide3.jpg', order: 3, durationSeconds: 5 },
  { title: '추억의 사진 4', type: 'image' as const, srcPath: 'images/slide4.jpg', order: 4, durationSeconds: 5 },
  { title: '추억의 사진 5', type: 'image' as const, srcPath: 'images/slide5.jpg', order: 5, durationSeconds: 5 },
  { title: '추억의 사진 6', type: 'image' as const, srcPath: 'images/slide6.jpg', order: 6, durationSeconds: 5 },
  { title: '추억의 사진 7', type: 'image' as const, srcPath: 'images/slide7.jpg', order: 7, durationSeconds: 5 },
]

async function computeChecksum(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('md5')
    const stream = fs.createReadStream(filePath)
    stream.on('error', reject)
    stream.on('data', chunk => hash.update(chunk))
    stream.on('end', () => resolve(hash.digest('hex')))
  })
}

async function uploadToGridFs(filePath: string, options: { originalPath: string; category: MediaCategory; mimeType: string }) {
  const bucket = getMediaBucket()
  return new Promise<{
    id: mongoose.Types.ObjectId
    length: number
  }>((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(path.basename(filePath), {
      contentType: options.mimeType,
      metadata: {
        originalPath: options.originalPath,
        category: options.category,
      },
    })

    fs.createReadStream(filePath)
      .on('error', reject)
      .pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => {
        resolve({ id: uploadStream.id as mongoose.Types.ObjectId, length: uploadStream.length })
      })
  })
}

async function importFile(source: SourceConfig, filePath: string) {
  const stats = await fs.promises.stat(filePath)
  if (!stats.isFile()) return { skipped: true }

  const relativePath = path.relative(source.dir, filePath).replace(/\\/g, '/')
  const originalPath = [source.prefix, relativePath].filter(Boolean).join('/')

  const mimeType = mime.lookup(filePath) || 'application/octet-stream'
  const checksum = await computeChecksum(filePath)

  const existing = await MediaAsset.findOne({ originalPath })

  if (existing) {
    if (existing.checksum === checksum && existing.size === stats.size) {
      return { skipped: true }
    }

    const bucket = getMediaBucket()
    if (existing.gridFsId) {
      try {
        await bucket.delete(existing.gridFsId)
      } catch (error) {
        console.warn(`Failed to delete old GridFS file for ${originalPath}:`, error)
      }
    }

    const result = await uploadToGridFs(filePath, {
      originalPath,
      category: source.category,
      mimeType,
    })

    existing.filename = path.basename(filePath)
    existing.mimeType = mimeType
    existing.size = stats.size
    existing.category = source.category
    existing.gridFsId = result.id
    existing.checksum = checksum
    existing.metadata = { lastImportedAt: new Date() }
    await existing.save()

    return { updated: true }
  }

  try {
    const result = await uploadToGridFs(filePath, {
      originalPath,
      category: source.category,
      mimeType,
    })

    await MediaAsset.create({
      originalPath,
      filename: path.basename(filePath),
      mimeType,
      size: stats.size,
      category: source.category,
      gridFsId: result.id,
      checksum,
      metadata: { lastImportedAt: new Date() },
    })

    return { created: true }
  } catch (error: any) {
    if (error?.code === 11000) {
      console.warn(`Duplicate entry detected for ${originalPath}, treating as existing record.`)
      return { skipped: true }
    }
    throw error
  }
}

async function walkAndImport(source: SourceConfig) {
  if (!fs.existsSync(source.dir)) {
    console.warn(`Skipping ${source.label} - directory not found: ${source.dir}`)
    return { created: 0, updated: 0 }
  }

  const entries = await fs.promises.readdir(source.dir)
  let created = 0
  let updated = 0

  for (const entry of entries) {
    const entryPath = path.join(source.dir, entry)
    const stats = await fs.promises.stat(entryPath)
    if (stats.isDirectory()) {
      const nestedSource: SourceConfig = {
        ...source,
        dir: entryPath,
        prefix: [source.prefix, entry].filter(Boolean).join('/'),
      }
      const result = await walkAndImport(nestedSource)
      created += result.created
      updated += result.updated
    } else {
      const result = await importFile(source, entryPath)
      if (result.created) created += 1
      if (result.updated) updated += 1
    }
  }

  return { created, updated }
}

async function ensureSpotlightSlides() {
  for (const slide of DEFAULT_SPOTLIGHT) {
    await SpotlightSlide.updateOne(
      { srcPath: slide.srcPath },
      {
        $set: {
          title: slide.title,
          type: slide.type,
          srcPath: slide.srcPath,
          posterPath: slide.posterPath,
          order: slide.order,
          durationSeconds: slide.durationSeconds,
          isActive: true,
        },
      },
      { upsert: true }
    )
  }
}

async function main() {
  const { default: dbConnect } = await import('@/lib/mongodb')
  await dbConnect()
  console.log('Connected to MongoDB')

  const summary = { created: 0, updated: 0 }

  for (const source of SOURCES) {
    console.log(`\nImporting ${source.label} from ${source.dir}`)
    const result = await walkAndImport(source)
    summary.created += result.created
    summary.updated += result.updated
    console.log(`  -> created ${result.created}, updated ${result.updated}`)
  }

  await ensureSpotlightSlides()
  console.log('\nSpotlight slides ensured.')

  console.log(`\nImport completed. Created: ${summary.created}, Updated: ${summary.updated}`)
}

main()
  .catch(error => {
    console.error('Media import failed:', error)
    process.exitCode = 1
  })
  .finally(async () => {
    await mongoose.disconnect()
    resetMediaBucket()
  })
