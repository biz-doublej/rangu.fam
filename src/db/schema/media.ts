import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * 작은 이미지(<5MB)를 base64로 DB에 저장. legacy. 신규는 GCS로.
 */
export const images = pgTable(
  'images',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    filename: text('filename').notNull().unique(),
    originalName: text('original_name').notNull(),
    mimeType: text('mime_type').notNull(),
    size: integer('size').notNull(),
    data: text('data').notNull(), // base64
    uploadedBy: text('uploaded_by').notNull(),
    uploadedById: text('uploaded_by_id').notNull(),
    category: text('category').notNull().default('general'), // 'profile' | 'wiki' | 'music' | 'general'
    description: text('description'),
    isPublic: boolean('is_public').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uploadedByIdx: index('images_uploaded_by_idx').on(t.uploadedById),
    categoryIdx: index('images_category_idx').on(t.category),
    createdAtIdx: index('images_created_at_idx').on(t.createdAt),
    mimeTypeIdx: index('images_mime_type_idx').on(t.mimeType),
  })
)

/**
 * 큰 미디어(GridFS에 저장됐던 것). gridFsId는 FerretDB 시절 잔재 — 신규는 GCS path로 이전.
 */
export const mediaAssets = pgTable(
  'media_assets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    originalPath: text('original_path').notNull().unique(),
    filename: text('filename').notNull(),
    mimeType: text('mime_type').notNull(),
    size: integer('size').notNull(),
    category: text('category').notNull().default('other'), // 'image' | 'video' | 'audio' | 'wiki' | 'other'
    gridFsId: text('grid_fs_id').notNull(), // legacy ObjectId string
    description: text('description'),
    tags: text('tags').array().notNull().default([]),
    checksum: text('checksum'),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    categoryCreatedIdx: index('media_category_created_idx').on(t.category, t.createdAt),
    tagsIdx: index('media_tags_idx').on(t.tags),
    checksumIdx: index('media_checksum_idx').on(t.checksum),
  })
)

/**
 * 메인 페이지 스포트라이트 슬라이드.
 */
export const spotlightSlides = pgTable(
  'spotlight_slides',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    type: text('type').notNull(), // 'video' | 'image'
    description: text('description'),
    srcPath: text('src_path').notNull(),
    posterPath: text('poster_path'),
    order: integer('order').notNull().default(0),
    durationSeconds: integer('duration_seconds').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    tags: text('tags').array().notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    activeOrderIdx: index('spotlight_active_order_idx').on(t.isActive, t.order),
    srcPathIdx: index('spotlight_src_path_idx').on(t.srcPath),
  })
)

export type Image = typeof images.$inferSelect
export type NewImage = typeof images.$inferInsert
export type MediaAsset = typeof mediaAssets.$inferSelect
export type SpotlightSlide = typeof spotlightSlides.$inferSelect
export type NewSpotlightSlide = typeof spotlightSlides.$inferInsert
