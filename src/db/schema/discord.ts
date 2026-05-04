import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * Discord 계정 ↔ 멤버/위키 연결 테이블.
 * `discordId`가 자연 키.
 */
export const discordLinks = pgTable('discord_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  discordId: text('discord_id').notNull().unique(),
  discordUsername: text('discord_username'),
  discordAvatar: text('discord_avatar'),

  memberId: text('member_id'),
  memberLinkedAt: timestamp('member_linked_at', { withTimezone: true }),

  wikiUserId: uuid('wiki_user_id'), // soft ref to wiki user (wiki schema 별도 작업 후 FK)
  wikiUsername: text('wiki_username'),
  wikiLinkedAt: timestamp('wiki_linked_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type DiscordLink = typeof discordLinks.$inferSelect
export type NewDiscordLink = typeof discordLinks.$inferInsert
