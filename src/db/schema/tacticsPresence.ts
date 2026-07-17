import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { wikiUsers } from './wiki'

export const tacticsPresence = pgTable('tactics_presence', {
  userId: uuid('user_id').primaryKey().references(() => wikiUsers.id, { onDelete: 'cascade' }),
  state: text('state').notNull().default('lobby').$type<'lobby' | 'in_game'>(),
  lastHeartbeatAt: timestamp('last_heartbeat_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  heartbeatIdx: index('tp_last_heartbeat_idx').on(table.lastHeartbeatAt),
}))
