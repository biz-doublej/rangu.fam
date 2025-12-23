import { NextRequest } from 'next/server'
import { serveMediaByPath } from '@/lib/serveMediaByPath'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  return serveMediaByPath('uploads/wiki', params.path || [], request)
}
