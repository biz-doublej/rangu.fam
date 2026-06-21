import { NextRequest, NextResponse } from 'next/server'
import { buildTacticsMetadata } from '@/lib/tactics/metadata'

export const dynamic = 'force-dynamic'

/**
 * 카드 메타데이터 export — Unity 클라이언트 / .NET 게임서버 공통 소비용 버전드 JSON.
 *
 * - ETag = schema+contentVersion → 변경 없으면 304 (Unity 패치/부팅 시 캐시 효율).
 * - ?version=<v> 핀: 현재 contentVersion 과 다르면 409 → 클라가 "업데이트 필요" 인지.
 *   (proto ConnectRequest.client_version / VERSION_MISMATCH 와 짝을 이뤄,
 *    클라·서버가 같은 데이터 버전을 쓰도록 보장.)
 * - 카드 데이터는 비밀이 아니므로 공개 + 캐시. (운영: CDN 캐시 가능.)
 */
export async function GET(request: NextRequest) {
  const doc = await buildTacticsMetadata()

  const requested = request.nextUrl.searchParams.get('version')
  if (requested && requested !== doc.contentVersion) {
    return NextResponse.json(
      { success: false, error: 'version_mismatch', current: doc.contentVersion },
      { status: 409, headers: { 'x-tactics-content-version': doc.contentVersion } }
    )
  }

  const etag = `"tactics-${doc.schemaVersion}-${doc.contentVersion}"`
  if (request.headers.get('if-none-match') === etag) {
    return new NextResponse(null, { status: 304, headers: { etag } })
  }

  return NextResponse.json(doc, {
    headers: {
      etag,
      'cache-control': 'public, max-age=300, must-revalidate',
      'x-tactics-content-version': doc.contentVersion,
    },
  })
}
