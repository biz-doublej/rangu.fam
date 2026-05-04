import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * 사용자별 개인 북마크. userId는 멤버 코드(jaewon/minseok/jinkyu/hanul/seungchan).
 */
export const bookmarks = pgTable(
  'bookmarks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id').notNull(), // 'jaewon' | 'minseok' | ...
    title: text('title').notNull(),
    url: text('url').notNull(),
    description: text('description'),
    icon: text('icon').default('🔗'),
    order: integer('order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userOrderIdx: index('bookmarks_user_order_idx').on(t.userId, t.order),
  })
)

export type Bookmark = typeof bookmarks.$inferSelect
export type NewBookmark = typeof bookmarks.$inferInsert
