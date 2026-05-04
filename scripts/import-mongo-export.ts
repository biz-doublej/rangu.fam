/**
 * Import a mongoexport JSON dump into Cloud SQL Postgres via Drizzle.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npx tsx scripts/import-mongo-export.ts \
 *     --dir C:/Users/jaewo/Desktop/rangu.fam/exports/test
 *
 * Each Mongo collection has its own mapping below. Add new collections to
 * COLLECTION_MAP. Skipped collections (empty / not migrated) are logged.
 *
 * Mongo Extended JSON v2 quirks handled:
 *   - {$oid: "..."}  → string (then mapped to UUID if target column is uuid)
 *   - {$date: "..."} → Date
 *   - {$numberLong: "..."} → number
 */

import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Pool } from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'
import { sql } from 'drizzle-orm'
import * as schema from '../src/db/schema'

// ── CLI args ────────────────────────────────────────────────
const args = parseArgs(process.argv.slice(2))
const exportDir = args.dir || './exports/test'
const onlyArg = args.only ? args.only.split(',').map((s) => s.trim()) : null

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const db = drizzle(pool, { schema })

// ── Helpers ─────────────────────────────────────────────────
function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      const next = argv[i + 1]
      if (next && !next.startsWith('--')) {
        out[key] = next
        i++
      } else {
        out[key] = 'true'
      }
    }
  }
  return out
}

/** Normalize Mongo Extended JSON values recursively. */
function unwrap(v: unknown): unknown {
  if (v === null || typeof v !== 'object') return v
  if (Array.isArray(v)) return v.map(unwrap)
  const obj = v as Record<string, unknown>
  if ('$oid' in obj && typeof obj.$oid === 'string') return obj.$oid
  if ('$date' in obj) {
    const d = obj.$date
    if (typeof d === 'string') return new Date(d)
    if (typeof d === 'object' && d && '$numberLong' in (d as object)) {
      return new Date(Number((d as { $numberLong: string }).$numberLong))
    }
  }
  if ('$numberLong' in obj) return Number(obj.$numberLong)
  if ('$numberInt' in obj) return Number(obj.$numberInt)
  if ('$numberDouble' in obj) return Number(obj.$numberDouble)
  const out: Record<string, unknown> = {}
  for (const [k, val] of Object.entries(obj)) {
    out[k] = unwrap(val)
  }
  return out
}

/**
 * Stable namespace UUID for converting MongoDB ObjectId (24 hex) → deterministic UUID.
 * Same ObjectId always maps to the same UUID, so foreign references stay consistent.
 */
function objectIdToUuid(oid: string): string {
  // Pad/truncate to 32 hex chars then format as UUID
  const hex = oid.padEnd(32, '0').slice(0, 32)
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`
}

function loadCollection(name: string): any[] {
  const path = join(exportDir, `${name}.json`)
  const raw = readFileSync(path, 'utf8')
  if (raw.trim() === '[]') return []
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) {
    throw new Error(`${name}.json is not an array`)
  }
  return parsed.map(unwrap) as any[]
}

async function truncate(table: string) {
  await pool.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`)
}

async function importIn(table: string, rows: any[]) {
  if (!rows.length) {
    console.log(`  ${table}: 0 rows (skipped)`)
    return
  }
  const chunkSize = 500
  let total = 0
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize)
    const cols = Object.keys(chunk[0])
    const values: any[] = []
    const placeholders = chunk
      .map((row, rowIdx) => {
        const colPlaceholders = cols.map((_, colIdx) => `$${rowIdx * cols.length + colIdx + 1}`)
        return `(${colPlaceholders.join(',')})`
      })
      .join(',')
    for (const row of chunk) {
      for (const c of cols) values.push(row[c])
    }
    const stmt = `INSERT INTO ${table} (${cols.map((c) => `"${c}"`).join(',')}) VALUES ${placeholders} ON CONFLICT DO NOTHING`
    await pool.query(stmt, values)
    total += chunk.length
  }
  console.log(`  ${table}: ${total} rows imported`)
}

// ── Per-collection mappers ─────────────────────────────────
type Mapper = {
  collection: string
  table: string
  map: (doc: any) => Record<string, any> | null
}

const MAPPERS: Mapper[] = [
  // ── cards (master data) ────────────────────────────────
  {
    collection: 'cards',
    table: 'cards',
    map: (d) => ({
      id: objectIdToUuid(d._id),
      card_id: d.cardId,
      name: d.name,
      type: d.type,
      rarity: d.rarity,
      description: d.description ?? '',
      image_url: d.imageUrl ?? '',
      member: d.member ?? null,
      year: d.year ?? null,
      period: d.period ?? null,
      is_group_card: Boolean(d.isGroupCard),
      drop_rate: d.dropRate ?? 0,
      max_copies: d.maxCopies ?? null,
      can_be_used_for_crafting: Boolean(d.canBeUsedForCrafting),
      crafting_recipe: d.craftingRecipe ?? null,
      created_at: d.createdAt ?? new Date(),
      updated_at: d.updatedAt ?? new Date(),
    }),
  },
  // ── user_cards ─────────────────────────────────────────
  {
    collection: 'usercards',
    table: 'user_cards',
    map: (d) => ({
      id: objectIdToUuid(d._id),
      user_id: objectIdToUuid(d.userId),
      card_id: d.cardId,
      quantity: d.quantity ?? 1,
      acquired_at: d.acquiredAt ?? d.createdAt ?? new Date(),
      acquired_by: d.acquiredBy ?? 'drop',
      is_favorite: Boolean(d.isFavorite),
      is_locked: Boolean(d.isLocked),
      created_at: d.createdAt ?? new Date(),
      updated_at: d.updatedAt ?? new Date(),
    }),
  },
  // ── user_card_stats ────────────────────────────────────
  {
    collection: 'usercardstats',
    table: 'user_card_stats',
    map: (d) => ({
      id: objectIdToUuid(d._id),
      user_id: objectIdToUuid(d.userId),
      last_drop_date: d.lastDropDate ?? new Date(),
      daily_drops_used: d.dailyDropsUsed ?? 0,
      total_drops_used: d.totalDropsUsed ?? 0,
      total_cards_owned: d.totalCardsOwned ?? 0,
      unique_cards_owned: d.uniqueCardsOwned ?? 0,
      total_cards_collected: d.totalCardsCollected ?? 0,
      basic_cards_owned: d.basicCardsOwned ?? 0,
      rare_cards_owned: d.rareCardsOwned ?? 0,
      epic_cards_owned: d.epicCardsOwned ?? 0,
      legendary_cards_owned: d.legendaryCardsOwned ?? 0,
      material_cards_owned: d.materialCardsOwned ?? 0,
      crafting_attempts: d.craftingAttempts ?? 0,
      successful_crafts: d.successfulCrafts ?? 0,
      failed_crafts: d.failedCrafts ?? 0,
      year_card_completion: JSON.stringify(d.yearCardCompletion ?? []),
      achievements: JSON.stringify(d.achievements ?? []),
      created_at: d.createdAt ?? new Date(),
      updated_at: d.updatedAt ?? new Date(),
    }),
  },
  // ── card_drops ──────────────────────────────────────────
  {
    collection: 'carddrops',
    table: 'card_drops',
    map: (d) => ({
      id: objectIdToUuid(d._id),
      user_id: objectIdToUuid(d.userId),
      card_id: d.cardId,
      drop_type: d.dropType ?? 'daily',
      dropped_at: d.droppedAt ?? d.createdAt ?? new Date(),
      daily_drop_count: d.dailyDropCount ?? 1,
      crafting_attempt: d.craftingAttempt ?? null,
      created_at: d.createdAt ?? new Date(),
    }),
  },
  // ── discord_links ───────────────────────────────────────
  {
    collection: 'discordlinks',
    table: 'discord_links',
    map: (d) => ({
      id: objectIdToUuid(d._id),
      discord_id: d.discordId,
      discord_username: d.discordUsername ?? null,
      discord_avatar: d.discordAvatar ?? null,
      member_id: d.memberId ?? null,
      member_linked_at: d.memberLinkedAt ?? null,
      wiki_user_id: d.wikiUserId ? objectIdToUuid(d.wikiUserId) : null,
      wiki_username: d.wikiUsername ?? null,
      wiki_linked_at: d.wikiLinkedAt ?? null,
      created_at: d.createdAt ?? new Date(),
      updated_at: d.updatedAt ?? new Date(),
    }),
  },
  // ── spotlight_slides ────────────────────────────────────
  {
    collection: 'spotlightslides',
    table: 'spotlight_slides',
    map: (d) => ({
      id: objectIdToUuid(d._id),
      title: d.title,
      type: d.type,
      description: d.description ?? null,
      src_path: d.srcPath,
      poster_path: d.posterPath ?? null,
      order: d.order ?? 0,
      duration_seconds: d.durationSeconds ?? 0,
      is_active: d.isActive ?? true,
      tags: d.tags ?? [],
      created_at: d.createdAt ?? new Date(),
      updated_at: d.updatedAt ?? new Date(),
    }),
  },
  // ── images (legacy base64) ──────────────────────────────
  {
    collection: 'images',
    table: 'images',
    map: (d) => ({
      id: objectIdToUuid(d._id),
      filename: d.filename,
      original_name: d.originalName,
      mime_type: d.mimeType,
      size: d.size,
      data: d.data,
      uploaded_by: d.uploadedBy ?? '',
      uploaded_by_id: d.uploadedById ?? '',
      category: d.category ?? 'general',
      description: d.description ?? null,
      is_public: d.isPublic ?? true,
      created_at: d.createdAt ?? new Date(),
      updated_at: d.updatedAt ?? new Date(),
    }),
  },
  // ── media_assets ────────────────────────────────────────
  {
    collection: 'mediaassets',
    table: 'media_assets',
    map: (d) => ({
      id: objectIdToUuid(d._id),
      original_path: d.originalPath,
      filename: d.filename,
      mime_type: d.mimeType,
      size: d.size,
      category: d.category ?? 'other',
      grid_fs_id: typeof d.gridFsId === 'string' ? d.gridFsId : (d.gridFsId?.$oid ?? ''),
      description: d.description ?? null,
      tags: d.tags ?? [],
      checksum: d.checksum ?? null,
      metadata: d.metadata ?? null,
      created_at: d.createdAt ?? new Date(),
      updated_at: d.updatedAt ?? new Date(),
    }),
  },
  // ── site_history ────────────────────────────────────────
  {
    collection: 'sitehistories',
    table: 'site_history',
    map: (d) => ({
      id: objectIdToUuid(d._id),
      site_name: d.siteName ?? 'Rangu.fam',
      site_description: d.siteDescription ?? '',
      formation_date: d.formationDate,
      complete_date: d.completeDate,
      site_creation_date: d.siteCreationDate ?? d.createdAt,
      events: JSON.stringify(d.events ?? []),
      milestones: JSON.stringify(d.milestones ?? []),
      stats: d.stats ?? null,
      planned_events: JSON.stringify(d.plannedEvents ?? []),
      version_history: JSON.stringify(d.versionHistory ?? []),
      created_at: d.createdAt ?? new Date(),
      updated_at: d.updatedAt ?? new Date(),
    }),
  },
  // ── wiki_users ──────────────────────────────────────────
  {
    collection: 'wikiusers',
    table: 'wiki_users',
    map: (d) => ({
      id: objectIdToUuid(d._id),
      username: d.username,
      email: d.email,
      password: d.password ?? '',
      sso_subject: d.ssoSubject ?? null,
      discord_id: d.discordId ?? null,
      discord_username: d.discordUsername ?? null,
      discord_avatar: d.discordAvatar ?? null,
      display_name: d.displayName ?? null,
      avatar: d.avatar ?? null,
      bio: d.bio ?? null,
      signature: d.signature ?? null,
      role: d.role ?? 'editor',
      permissions: d.permissions ?? {
        canEdit: true,
        canDelete: false,
        canProtect: false,
        canBan: false,
        canManageUsers: false,
      },
      edits: d.edits ?? 0,
      pages_created: d.pagesCreated ?? 0,
      discussion_posts: d.discussionPosts ?? 0,
      reputation: d.reputation ?? 0,
      preferences: d.preferences ?? {
        theme: 'auto',
        timezone: 'Asia/Seoul',
        emailNotifications: true,
        showEmail: false,
        autoWatchPages: true,
      },
      is_active: d.isActive ?? true,
      ban_status: d.banStatus ?? null,
      warnings: JSON.stringify(d.warnings ?? []),
      last_login: d.lastLogin ?? null,
      last_activity: d.lastActivity ?? null,
      main_user_id: d.mainUserId ? objectIdToUuid(d.mainUserId) : null,
      created_at: d.createdAt ?? new Date(),
      updated_at: d.updatedAt ?? new Date(),
    }),
  },
  // ── wiki_pages (without embedded revisions/discussions) ──
  {
    collection: 'wikipages',
    table: 'wiki_pages',
    map: (d) => ({
      id: objectIdToUuid(d._id),
      title: d.title,
      slug: d.slug,
      namespace: d.namespace ?? 'main',
      content: d.content ?? '',
      summary: d.summary ?? null,
      categories: d.categories ?? [],
      tags: d.tags ?? [],
      aliases: d.aliases ?? [],
      creator: d.creator,
      creator_id: d.creatorId ? objectIdToUuid(d.creatorId) : null,
      last_editor: d.lastEditor ?? null,
      last_editor_id: d.lastEditorId ? objectIdToUuid(d.lastEditorId) : null,
      last_edit_date: d.lastEditDate ?? new Date(),
      last_edit_summary: d.lastEditSummary ?? null,
      current_revision: d.currentRevision ?? 1,
      protection: d.protection ?? { level: 'none', allowedRoles: [] },
      is_redirect: Boolean(d.isRedirect),
      redirect_target: d.redirectTarget ?? null,
      is_deleted: Boolean(d.isDeleted),
      deleted_by: d.deletedBy ?? null,
      delete_reason: d.deleteReason ?? null,
      is_stub: Boolean(d.isStub),
      is_featured: Boolean(d.isFeatured),
      views: d.views ?? 0,
      unique_views: d.uniqueViews ?? 0,
      edits: d.edits ?? 0,
      watchers: (d.watchers ?? []).map((w: any) =>
        typeof w === 'string' ? w : objectIdToUuid(w)
      ),
      incoming_links: d.incomingLinks ?? [],
      outgoing_links: d.outgoingLinks ?? [],
      table_of_contents: JSON.stringify(d.tableOfContents ?? []),
      template_info: d.templateInfo ?? { isTemplate: false, parameters: [] },
      edit_lock: d.editLock ?? { isLocked: false, lockReason: 'editing' },
      created_at: d.createdAt ?? new Date(),
      updated_at: d.updatedAt ?? new Date(),
    }),
  },
  // ── wiki_submissions ────────────────────────────────────
  {
    collection: 'wikisubmissions',
    table: 'wiki_submissions',
    map: (d) => ({
      id: objectIdToUuid(d._id),
      type: d.type,
      status: d.status ?? 'pending',
      reason: d.reason ?? null,
      namespace: d.namespace ?? 'main',
      target_title: d.targetTitle,
      target_slug: d.targetSlug,
      page_id: d.pageId ? objectIdToUuid(d.pageId) : null,
      content: d.content ?? '',
      summary: d.summary ?? null,
      edit_summary: d.editSummary ?? null,
      categories: d.categories ?? [],
      tags: d.tags ?? [],
      expected_revision: d.expectedRevision ?? null,
      author: d.author,
      author_id: objectIdToUuid(d.authorId),
      reviewed_by: d.reviewedBy ?? null,
      reviewer_id: d.reviewerId ? objectIdToUuid(d.reviewerId) : null,
      reviewed_at: d.reviewedAt ?? null,
      created_at: d.createdAt ?? new Date(),
      updated_at: d.updatedAt ?? new Date(),
    }),
  },
  // ── wiki_workshop_statements ───────────────────────────
  {
    collection: 'wikiworkshopstatements',
    table: 'wiki_workshop_statements',
    map: (d) => ({
      id: objectIdToUuid(d._id),
      payload: d,
      created_at: d.createdAt ?? new Date(),
      updated_at: d.updatedAt ?? new Date(),
    }),
  },
]

// ── Run ─────────────────────────────────────────────────────
async function main() {
  console.log(`Importing from ${exportDir}`)
  console.log(`Filter: ${onlyArg ? onlyArg.join(',') : 'all'}\n`)

  const truncateMode = args.truncate === 'true'
  if (truncateMode) {
    console.log('TRUNCATE mode: clearing target tables first\n')
  }

  for (const m of MAPPERS) {
    if (onlyArg && !onlyArg.includes(m.collection)) continue
    try {
      const docs = loadCollection(m.collection)
      if (docs.length === 0) {
        console.log(`${m.collection} → ${m.table}: empty, skipping`)
        continue
      }
      if (truncateMode) await truncate(m.table)
      const rows = docs.map(m.map).filter(Boolean) as Record<string, any>[]
      console.log(`${m.collection} → ${m.table}: ${docs.length} docs`)
      await importIn(m.table, rows)
    } catch (err: any) {
      console.error(`${m.collection} FAILED:`, err.message)
    }
  }

  await pool.end()
  console.log('\n✓ Import complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
