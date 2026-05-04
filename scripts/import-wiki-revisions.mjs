import { readFileSync } from 'node:fs'
import pg from 'pg'

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const objectIdToUuid = (oid) => {
  const hex = oid.padEnd(32, '0').slice(0, 32)
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`
}

const unwrap = (v) => {
  if (v === null || typeof v !== 'object') return v
  if (Array.isArray(v)) return v.map(unwrap)
  if ('$oid' in v) return v.$oid
  if ('$date' in v) return new Date(v.$date)
  if ('$numberLong' in v) return Number(v.$numberLong)
  const out = {}
  for (const [k, val] of Object.entries(v)) out[k] = unwrap(val)
  return out
}

const pages = JSON.parse(readFileSync('C:/Users/jaewo/Desktop/rangu.fam/exports/test/wikipages.json', 'utf8'))
let total = 0, skipped = 0

for (const rawPage of pages) {
  const page = unwrap(rawPage)
  const pageUuid = objectIdToUuid(page._id)
  const revs = page.revisions || []
  if (!revs.length) continue

  for (const rev of revs) {
    const revId = rev._id
      ? objectIdToUuid(rev._id)
      : objectIdToUuid(`${page._id}_${rev.revisionNumber || total}`)
    try {
      await pool.query(
        `INSERT INTO wiki_revisions (
          id, page_id, revision_number, content, summary,
          author, author_id, author_ip,
          edit_type, is_minor_edit, is_automated,
          content_length, size_change,
          is_reverted, reverted_by, revert_reason,
          is_verified, verified_by,
          timestamp_at, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
        ON CONFLICT (id) DO NOTHING`,
        [
          revId, pageUuid, rev.revisionNumber ?? 1, rev.content ?? '', rev.summary ?? null,
          rev.author ?? page.creator, rev.authorId ? objectIdToUuid(rev.authorId) : null, rev.authorIP ?? null,
          rev.editType ?? 'edit', Boolean(rev.isMinorEdit), Boolean(rev.isAutomated),
          rev.contentLength ?? (rev.content?.length ?? 0), rev.sizeChange ?? 0,
          Boolean(rev.isReverted), rev.revertedBy ?? null, rev.revertReason ?? null,
          Boolean(rev.isVerified), rev.verifiedBy ?? null,
          rev.timestamp ?? rev.createdAt ?? new Date(),
          rev.createdAt ?? new Date(),
          rev.updatedAt ?? new Date()
        ]
      )
      total++
    } catch (e) {
      skipped++
      if (skipped <= 3) console.error(`  page=${page.title} rev=${rev.revisionNumber}: ${e.message}`)
    }
  }
}

console.log(`Inserted: ${total} / Skipped: ${skipped}`)
const r = await pool.query('SELECT count(*) FROM wiki_revisions')
console.log(`wiki_revisions total: ${r.rows[0].count}`)
await pool.end()
