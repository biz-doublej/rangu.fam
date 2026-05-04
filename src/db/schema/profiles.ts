import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { users } from './users'

/**
 * 멤버 프로필 (User와 1:1, username 별칭).
 *
 * 중첩 컬렉션(skills, projects, experience, education, recentPosts)은
 * 정규화 대신 jsonb로 보관 — 검색 요구 낮고, Mongoose 시절 1 document 통째로
 * 조회/저장하던 사용 패턴을 그대로 보존하기 위함.
 */
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  username: text('username').notNull().unique(),

  // 개인 정보
  intro: text('intro').notNull().default(''),
  bio: text('bio').notNull().default(''),
  location: text('location').notNull().default(''),
  website: text('website'),
  phone: text('phone'),
  birthdate: timestamp('birthdate', { withTimezone: true }),

  // 도메인별 jsonb (스키마 자율 — 변경 잦음)
  militaryInfo: jsonb('military_info').$type<{
    branch?: string
    rank?: string
    unit?: string
    enlistmentDate?: string
    dischargeDate?: string
    trainingEndDate?: string
    daysServed?: number
    daysRemaining?: number
    totalServiceDays?: number
    motto?: string
  } | null>(),

  skills: jsonb('skills').notNull().default([]).$type<Array<{
    name: string
    level: number
    category: string
  }>>(),
  projects: jsonb('projects').notNull().default([]).$type<Array<Record<string, unknown>>>(),
  experience: jsonb('experience').notNull().default([]).$type<Array<Record<string, unknown>>>(),
  education: jsonb('education').notNull().default([]).$type<Array<Record<string, unknown>>>(),
  socialLinks: jsonb('social_links').$type<{
    github?: string
    linkedin?: string
    website?: string
    instagram?: string
    twitter?: string
    blog?: string
  } | null>(),
  recentPosts: jsonb('recent_posts').notNull().default([]).$type<Array<Record<string, unknown>>>(),

  // 통계 / 설정
  viewCount: integer('view_count').notNull().default(0),
  likesReceived: integer('likes_received').notNull().default(0),
  projectCount: integer('project_count').notNull().default(0),
  followers: text('followers').array().notNull().default([]), // soft ref to user ids
  following: text('following').array().notNull().default([]),
  isPublic: boolean('is_public').notNull().default(true),
  showEmail: boolean('show_email').notNull().default(false),
  showPhone: boolean('show_phone').notNull().default(false),
  allowComments: boolean('allow_comments').notNull().default(true),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert
