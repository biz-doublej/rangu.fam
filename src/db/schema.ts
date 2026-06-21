/**
 * Drizzle schema — single source of truth for the Postgres database.
 *
 * Each Mongoose model in src/models/ has been (or will be) translated here.
 * Keep tables grouped by domain: auth, profile, cards, wiki, media, misc.
 */

export * from './schema/users'
export * from './schema/profiles'
export * from './schema/bookmarks'
export * from './schema/cards'
export * from './schema/cardBattle'
export * from './schema/cardGameDefs'
export * from './schema/discord'
export * from './schema/media'
export * from './schema/site'
export * from './schema/wiki'
