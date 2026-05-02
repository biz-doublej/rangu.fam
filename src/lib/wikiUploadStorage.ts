import path from 'path'
import { getOptionalEnv } from '@/lib/env'

const DEFAULT_WIKI_UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'wiki')

function withTrailingSeparator(value: string) {
  return value.endsWith(path.sep) ? value : `${value}${path.sep}`
}

function decodeSegment(segment: string) {
  const decoded = decodeURIComponent(segment).trim().replace(/\\/g, '/')
  if (!decoded || decoded === '.' || decoded === '..' || decoded.includes('/')) {
    return null
  }
  return decoded
}

export function getWikiUploadsDir() {
  const configured = getOptionalEnv('WIKI_UPLOADS_DIR')
  return path.resolve(configured || DEFAULT_WIKI_UPLOADS_DIR)
}

export function sanitizeWikiSegments(segments: string[]) {
  const safeSegments: string[] = []
  for (const segment of segments) {
    try {
      const decoded = decodeSegment(segment)
      if (!decoded) {
        return null
      }
      safeSegments.push(decoded)
    } catch {
      return null
    }
  }
  return safeSegments
}

export function resolveWikiUploadPath(segments: string[]) {
  const safeSegments = sanitizeWikiSegments(segments)
  if (!safeSegments) {
    return null
  }

  const rootDir = getWikiUploadsDir()
  const absolutePath = path.resolve(rootDir, ...safeSegments)
  const rootWithSeparator = withTrailingSeparator(rootDir)

  if (absolutePath !== rootDir && !absolutePath.startsWith(rootWithSeparator)) {
    return null
  }

  return absolutePath
}
