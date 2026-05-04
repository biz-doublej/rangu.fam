import { boolean, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * 사이트 전역 히스토리 — 보통 단일 row.
 * events / milestones / stats 등 nested는 jsonb로 처리.
 */
export const siteHistory = pgTable('site_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteName: text('site_name').notNull().default('Rangu.fam'),
  siteDescription: text('site_description').notNull().default('네 친구들의 소중한 공간'),

  formationDate: timestamp('formation_date', { withTimezone: true }).notNull(),
  completeDate: timestamp('complete_date', { withTimezone: true }).notNull(),
  siteCreationDate: timestamp('site_creation_date', { withTimezone: true }).notNull(),

  events: jsonb('events').notNull().default([]).$type<Array<{
    title: string
    description?: string
    date: string
    type: 'formation' | 'member' | 'milestone' | 'feature' | 'anniversary' | 'special'
    icon: string
    color: string
    relatedMembers: string[]
    importance: number
    images: string[]
    links: Array<{ title?: string; url: string }>
    isPublic: boolean
    isAnniversary: boolean
    anniversary?: { interval: number; nextDate: string }
    createdAt: string
    updatedAt: string
  }>>(),

  milestones: jsonb('milestones').notNull().default([]).$type<Array<{
    name: string
    type: 'formation' | 'complete'
    targetDays: number
    emoji: string
    color: string
    isCompleted: boolean
    completedDate?: string
    specialMessage?: string
    celebrationDetails: {
      hasSpecialEvent: boolean
      eventDescription?: string
      eventImages: string[]
    }
    createdAt: string
    updatedAt: string
  }>>(),

  stats: jsonb('stats').$type<{
    totalVisits: number
    uniqueVisitors: number
    totalPages: number
    totalUsers: number
    totalPosts: number
    totalComments: number
    totalLikes: number
    totalMusicPlays: number
    totalGameScores: number
    monthlyStats: Array<{
      year: number
      month: number
      visits: number
      newUsers: number
      newPosts: number
      newComments: number
    }>
  }>(),

  plannedEvents: jsonb('planned_events').notNull().default([]).$type<Array<{
    name: string
    description?: string
    targetDate?: string
    type?: string
    isAnniversary: boolean
  }>>(),

  versionHistory: jsonb('version_history').notNull().default([]).$type<Array<{
    version: string
    releaseDate: string
    features: string[]
    bugFixes: string[]
    improvements: string[]
    contributor?: string
  }>>(),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

/**
 * 트랙/플레이리스트 댓글 (legacy, 사용처 확인 후 제거 가능).
 */
export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    content: text('content').notNull(),
    userId: text('user_id').notNull(),
    userById: text('user_by_id').notNull(),
    username: text('username').notNull(),
    trackId: text('track_id'),
    playlistId: text('playlist_id'),
    parentCommentId: text('parent_comment_id'),
    repliesIds: text('replies_ids').array().notNull().default([]),
    likes: integer('likes').notNull().default(0),
    isEdited: boolean('is_edited').notNull().default(false),
    editedAt: timestamp('edited_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    trackCreatedIdx: index('comments_track_created_idx').on(t.trackId, t.createdAt),
    playlistCreatedIdx: index('comments_playlist_created_idx').on(t.playlistId, t.createdAt),
    userByIdIdx: index('comments_user_by_id_idx').on(t.userById),
    parentIdx: index('comments_parent_idx').on(t.parentCommentId),
  })
)

export type SiteHistory = typeof siteHistory.$inferSelect
export type Comment = typeof comments.$inferSelect
