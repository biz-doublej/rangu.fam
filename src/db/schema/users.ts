import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * 메인 사용자 (랑구팸 통합 사용자).
 * Mongoose `User` 모델 → 1:1 매핑.
 *
 * password는 historical (legacy 로컬 인증), 현재 SSO에서는 사용 안 함.
 * favoriteGenres / favoriteTracksIds / playlistsIds 등 array → text[]
 * followingIds / followersIds → text[] (uuid 참조하지만 FK는 두지 않음 — soft ref)
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password'),
  profileImage: text('profile_image').default(''),
  role: text('role').notNull().default('member'), // 'admin' | 'member'
  bio: text('bio').default(''),
  favoriteGenres: text('favorite_genres').array().notNull().default([]),
  favoriteTracksIds: text('favorite_tracks_ids').array().notNull().default([]),
  playlistsIds: text('playlists_ids').array().notNull().default([]),
  followingIds: text('following_ids').array().notNull().default([]),
  followersIds: text('followers_ids').array().notNull().default([]),
  lastLogin: timestamp('last_login', { withTimezone: true }).notNull().defaultNow(),
  totalPlays: integer('total_plays').notNull().default(0),
  totalLikes: integer('total_likes').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
