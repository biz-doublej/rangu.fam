// 카드 아트 썸네일 생성 — 랑구 택틱스 덱 빌더 그리드용.
//
// 문제: 카드 원본이 장당 ~1.5MB 풀사이즈 JPEG(120장 ≈ 215MB). 덱 그리드는 ~200px 타일에
//       이걸 그대로 띄워 첫 진입이 매우 느림. 360px webp(~30KB)로 줄이면 체감 즉시.
//
// 사용:  (rangu.fam 루트에서, sharp 필요)
//   node scripts/gen-card-thumbs.mjs
// 출력:  <OUT>/<원본 하위경로>.webp  → 이후 GCS 업로드:
//   gcloud storage cp -r <OUT>/* gs://rangu-tactics-dist/card-thumbs/
// 게임(rangu-tactics-heavy)의 cardMetaToGameCard 가 이 GCS 썸네일 URL 을 art 로 사용.
// 카드 아트가 바뀌면 이 스크립트 재실행 + 재업로드.

import sharp from 'sharp'
import { readdirSync, mkdirSync, statSync } from 'fs'
import { join, relative, dirname, extname } from 'path'

const SRC = 'C:/Users/jaewo/Desktop/rangu.fam/public/images/cards'
const OUT = 'C:/Users/jaewo/Desktop/card-thumbs-build'
const WIDTH = 360
const QUALITY = 72

const EXTS = new Set(['.jpg', '.jpeg', '.png'])
const files = []
function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p)
    else if (EXTS.has(extname(e.name).toLowerCase())) files.push(p)
  }
}
walk(SRC)
console.log(`source images: ${files.length}`)

let done = 0
let totalOut = 0
for (const f of files) {
  const rel = relative(SRC, f).replace(/\.(jpe?g|png)$/i, '.webp')
  const out = join(OUT, rel)
  mkdirSync(dirname(out), { recursive: true })
  await sharp(f).resize({ width: WIDTH, withoutEnlargement: true }).webp({ quality: QUALITY }).toFile(out)
  totalOut += statSync(out).size
  done++
}
console.log(`thumbs written: ${done}  total: ${(totalOut / 1024 / 1024).toFixed(1)} MB  (avg ${(totalOut / done / 1024).toFixed(0)} KB)`)
