#!/usr/bin/env node
/**
 * Wiki syntax migration: namuwiki-style → markdown-style.
 *
 * 현재 위키는 두 가지 문법을 모두 지원함 (backward compatible).
 * 이 스크립트는 기존 문서들을 markdown-first 표기로 정리.
 *
 * 안전 가드:
 *  - ```...``` 코드 펜스 안의 텍스트는 절대 건드리지 않음
 *  - `inline code` 안의 텍스트도 보호
 *  - URL 안 (https://...) 은 변환 안 함
 *  - 라인 단위로 처리, 줄바꿈/공백 보존
 *
 * 변환 대상:
 *   '''bold'''   →  **bold**
 *   ''italic''   →  *italic*  (단, '''...''' 내부 / 따옴표 인용은 제외)
 *
 * 사용:
 *   DRY-RUN (기본):  node scripts/migrate-wiki-syntax.mjs
 *   APPLY:           node scripts/migrate-wiki-syntax.mjs --apply
 *
 * 환경변수: DATABASE_URL (Cloud SQL) 또는 PG_HOST/PG_USER/PG_PASSWORD/PG_DATABASE
 */

import pg from 'pg'

const APPLY = process.argv.includes('--apply')
const VERBOSE = process.argv.includes('--verbose')

const connectionString =
  process.env.DATABASE_URL ||
  (() => {
    const host = process.env.PG_HOST || '127.0.0.1'
    const user = process.env.PG_USER || 'rangu_app'
    const pw = process.env.PG_PASSWORD || ''
    const db = process.env.PG_DATABASE || 'rangu_fam'
    return `postgresql://${user}:${encodeURIComponent(pw)}@${host}:5432/${db}`
  })()

const pool = new pg.Pool({ connectionString })

// ── 라인 분류: 코드 블록 / 인라인 코드 / 일반 ───────────────
function transformLine(line, inCodeFence) {
  if (inCodeFence) return { line, changed: false, count: 0 }

  let out = line
  let count = 0

  // `inline code` 와 https?:// 부분을 마스킹 → 변환 → 복원
  const masks = []
  out = out.replace(/`[^`]+`|https?:\/\/[^\s)\]]+/g, (m) => {
    const idx = masks.length
    masks.push(m)
    return `MASK${idx}`
  })

  // '''bold''' → **bold** (3개의 quote, 비욕심)
  out = out.replace(/'''([^']+?)'''/g, (_m, inner) => {
    count += 1
    return `**${inner}**`
  })

  // ''italic'' → *italic*  (3개 prefix가 없는 것만 — 위에서 이미 처리됨)
  // ''xxx'' 패턴: 단, 옆에 또 '가 있으면 (즉 '''로 시작하면) 위에서 변환됨
  out = out.replace(/(?<!')''([^']+?)''(?!')/g, (_m, inner) => {
    count += 1
    return `*${inner}*`
  })

  // 마스크 복원
  out = out.replace(/MASK(\d+)/g, (_m, idx) => masks[Number(idx)])

  return { line: out, changed: out !== line, count }
}

// ── 페이지 본문 변환 ────────────────────────────────────────
function transformContent(content) {
  if (!content) return { content, changed: false, totalReplacements: 0, sample: [] }

  const lines = content.split('\n')
  const out = []
  let inCodeFence = false
  let totalReplacements = 0
  const sample = []

  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i]
    if (/^\s*```/.test(ln)) {
      inCodeFence = !inCodeFence
      out.push(ln)
      continue
    }

    const result = transformLine(ln, inCodeFence)
    out.push(result.line)
    if (result.changed) {
      totalReplacements += result.count
      if (sample.length < 3) {
        sample.push({ line: i + 1, before: ln, after: result.line })
      }
    }
  }

  const newContent = out.join('\n')
  return {
    content: newContent,
    changed: newContent !== content,
    totalReplacements,
    sample,
  }
}

// ── 메인 ─────────────────────────────────────────────────────
async function main() {
  console.log(`\n${APPLY ? '🚀 APPLY' : '🔍 DRY-RUN'} mode\n`)

  const { rows } = await pool.query(
    `SELECT id, title, slug, namespace, content FROM wiki_pages WHERE is_deleted IS NOT TRUE ORDER BY title`
  )
  console.log(`Loaded ${rows.length} pages\n`)

  let touchedPages = 0
  let totalReplacements = 0
  const allSamples = []

  for (const page of rows) {
    const { content, changed, totalReplacements: count, sample } = transformContent(page.content)
    if (!changed) continue

    touchedPages += 1
    totalReplacements += count
    allSamples.push({
      title: page.title,
      slug: page.slug,
      count,
      sample,
    })

    if (APPLY) {
      await pool.query(
        `UPDATE wiki_pages SET content = $1, updated_at = NOW() WHERE id = $2`,
        [content, page.id]
      )
      // revision도 추가해서 history 보존
      const [revRow] = (
        await pool.query(
          `SELECT current_revision FROM wiki_pages WHERE id = $1`,
          [page.id]
        )
      ).rows
      const newRev = (revRow?.current_revision || 1) + 1
      await pool.query(
        `INSERT INTO wiki_revisions (
          page_id, revision_number, content, summary, author, edit_type,
          is_minor_edit, is_automated, content_length, size_change, timestamp_at, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, 'edit', true, true, $6, $7, NOW(), NOW(), NOW())`,
        [
          page.id,
          newRev,
          content,
          'syntax migration: \\\'\\\'\\\'X\\\'\\\'\\\' → **X**, \\\'\\\'X\\\'\\\' → *X*',
          'system',
          content.length,
          content.length - (page.content?.length || 0),
        ]
      )
      await pool.query(
        `UPDATE wiki_pages SET current_revision = $1, edits = edits + 1, last_edit_summary = $2, last_edit_date = NOW(), last_editor = 'system' WHERE id = $3`,
        [newRev, '문법 자동 정리 (namuwiki → markdown)', page.id]
      )
    }
  }

  // 리포트
  console.log('━'.repeat(60))
  console.log(`📊 결과:`)
  console.log(`  • 변경 대상 페이지: ${touchedPages} / ${rows.length}`)
  console.log(`  • 총 치환 건수:     ${totalReplacements}`)
  console.log(`  • 모드:             ${APPLY ? '✅ APPLIED + revision 기록됨' : '👀 DRY-RUN (변경 안 함)'}`)
  console.log('━'.repeat(60))

  // 샘플
  console.log(`\n샘플 변경 (최대 ${VERBOSE ? 'all' : 10}개 페이지):\n`)
  const samplesToShow = VERBOSE ? allSamples : allSamples.slice(0, 10)
  for (const s of samplesToShow) {
    console.log(`📄 ${s.title} (${s.slug}) — ${s.count}건`)
    for (const ex of s.sample) {
      console.log(`   L${ex.line}:`)
      console.log(`     - ${ex.before.length > 100 ? ex.before.slice(0, 100) + '...' : ex.before}`)
      console.log(`     + ${ex.after.length > 100 ? ex.after.slice(0, 100) + '...' : ex.after}`)
    }
    console.log('')
  }

  if (allSamples.length > samplesToShow.length) {
    console.log(`... 그 외 ${allSamples.length - samplesToShow.length}개 페이지 (--verbose 로 전체 보기)\n`)
  }

  await pool.end()
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
