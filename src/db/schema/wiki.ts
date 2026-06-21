import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

/**
 * Wiki 도메인 — 7개 테이블.
 *
 * 디자인 노트:
 * - WikiPage의 embedded `revisions` / `discussions`는 테이블로 분리 (FK).
 *   배열로 두면 200KB 이상 단일 row가 발생할 수 있음 (라이브러리 페이지 등).
 * - 나머지 nested object (permissions, preferences, protection, editLock,
 *   templateInfo, tableOfContents, banStatus, warnings, replies, autoBackup)는
 *   질의 빈도 낮고 읽기/쓰기 통째로 발생 — jsonb 그대로.
 */

// ── Wiki 사용자 ────────────────────────────────────────────────
export const wikiUsers = pgTable(
  'wiki_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    username: text('username').notNull().unique(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(), // legacy local auth, SSO에선 미사용
    ssoSubject: text('sso_subject').unique(), // OIDC sub
    discordId: text('discord_id').unique(),
    discordUsername: text('discord_username'),
    discordAvatar: text('discord_avatar'),

    // 프로필
    displayName: text('display_name'),
    avatar: text('avatar'),
    bio: text('bio'),
    signature: text('signature'),

    // 권한
    role: text('role').notNull().default('editor'), // 'viewer'|'editor'|'moderator'|'admin'|'owner'
    permissions: jsonb('permissions').notNull().default({
      canEdit: true,
      canDelete: false,
      canProtect: false,
      canBan: false,
      canManageUsers: false,
    }).$type<{
      canEdit: boolean
      canDelete: boolean
      canProtect: boolean
      canBan: boolean
      canManageUsers: boolean
    }>(),

    // 통계
    edits: integer('edits').notNull().default(0),
    pagesCreated: integer('pages_created').notNull().default(0),
    discussionPosts: integer('discussion_posts').notNull().default(0),
    reputation: integer('reputation').notNull().default(0),

    preferences: jsonb('preferences').notNull().default({
      theme: 'auto',
      timezone: 'Asia/Seoul',
      emailNotifications: true,
      showEmail: false,
      autoWatchPages: true,
    }).$type<{
      theme: 'light' | 'dark' | 'auto'
      timezone: string
      emailNotifications: boolean
      showEmail: boolean
      autoWatchPages: boolean
    }>(),

    isActive: boolean('is_active').notNull().default(true),
    banStatus: jsonb('ban_status').$type<{
      isBanned: boolean
      reason?: string
      bannedBy?: string
      bannedAt?: string
      bannedUntil?: string
      unbannedBy?: string
      unbannedAt?: string
    } | null>(),
    warnings: jsonb('warnings').notNull().default([]).$type<Array<{
      reason: string
      warnedBy: string
      warnedAt: string
    }>>(),

    lastLogin: timestamp('last_login', { withTimezone: true }),
    lastActivity: timestamp('last_activity', { withTimezone: true }),
    mainUserId: uuid('main_user_id'), // soft ref to users.id

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    roleIdx: index('wiki_users_role_idx').on(t.role),
    activeIdx: index('wiki_users_active_idx').on(t.isActive),
  })
)

// ── Wiki 페이지 ────────────────────────────────────────────────
export const wikiPages = pgTable(
  'wiki_pages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    namespace: text('namespace').notNull().default('main'), // main|user|project|template|help|category|file

    content: text('content').notNull().default(''),
    summary: text('summary'),

    categories: text('categories').array().notNull().default([]),
    tags: text('tags').array().notNull().default([]),
    aliases: text('aliases').array().notNull().default([]),

    creator: text('creator').notNull(),
    creatorId: uuid('creator_id'),
    lastEditor: text('last_editor'),
    lastEditorId: uuid('last_editor_id'),
    lastEditDate: timestamp('last_edit_date', { withTimezone: true }).notNull().defaultNow(),
    lastEditSummary: text('last_edit_summary'),

    currentRevision: integer('current_revision').notNull().default(1),

    protection: jsonb('protection').notNull().default({
      level: 'none',
      allowedRoles: [],
    }).$type<{
      level: 'none' | 'semi' | 'full' | 'admin'
      reason?: string
      protectedBy?: string
      protectedUntil?: string
      allowedRoles: string[]
    }>(),

    isRedirect: boolean('is_redirect').notNull().default(false),
    redirectTarget: text('redirect_target'),
    isDeleted: boolean('is_deleted').notNull().default(false),
    deletedBy: text('deleted_by'),
    deleteReason: text('delete_reason'),
    isStub: boolean('is_stub').notNull().default(false),
    isFeatured: boolean('is_featured').notNull().default(false),

    views: integer('views').notNull().default(0),
    uniqueViews: integer('unique_views').notNull().default(0),
    edits: integer('edits').notNull().default(0),
    watchers: text('watchers').array().notNull().default([]), // wiki_user ids

    incomingLinks: text('incoming_links').array().notNull().default([]),
    outgoingLinks: text('outgoing_links').array().notNull().default([]),

    tableOfContents: jsonb('table_of_contents').notNull().default([]).$type<Array<{
      level: number
      title: string
      anchor: string
    }>>(),

    templateInfo: jsonb('template_info').notNull().default({
      isTemplate: false,
      parameters: [],
    }).$type<{
      isTemplate: boolean
      parameters: Array<{
        name?: string
        description?: string
        required: boolean
        defaultValue?: string
      }>
      usage?: string
    }>(),

    editLock: jsonb('edit_lock').notNull().default({
      isLocked: false,
      lockReason: 'editing',
    }).$type<{
      isLocked: boolean
      lockedBy?: string
      lockedById?: string
      lockStartTime?: string
      lockExpiry?: string
      lockReason?: string
    }>(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    namespaceIdx: index('wiki_pages_namespace_idx').on(t.namespace),
    categoriesIdx: index('wiki_pages_categories_idx').on(t.categories),
    viewsIdx: index('wiki_pages_views_idx').on(t.views),
    lastEditIdx: index('wiki_pages_last_edit_idx').on(t.lastEditDate),
  })
)

// ── 일별 조회수 롤업 ────────────────────────────────────────────
// wikiPages.views 는 누적 단일 카운터라 기간별(주/월) 실지표를 낼 수 없다.
// 문서를 열 때마다 (page_id, KST 날짜) 행을 upsert(+1)해서 시간축 있는
// 인기도 집계를 가능하게 한다. (page_id, day) 복합 PK — 페이지·날짜당 1행으로 bounded.
// 주간 = 최근 7일 합, 월간 = 최근 30일 합.
export const wikiPageViewDaily = pgTable(
  'wiki_page_view_daily',
  {
    pageId: uuid('page_id')
      .notNull()
      .references(() => wikiPages.id, { onDelete: 'cascade' }),
    day: date('day', { mode: 'string' }).notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.pageId, t.day] }),
    dayIdx: index('wiki_page_view_daily_day_idx').on(t.day),
  })
)

// ── Wiki 리비전 (페이지에서 분리) ───────────────────────────────
export const wikiRevisions = pgTable(
  'wiki_revisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pageId: uuid('page_id').notNull().references(() => wikiPages.id, { onDelete: 'cascade' }),
    revisionNumber: integer('revision_number').notNull(),
    content: text('content').notNull(),
    summary: text('summary'),

    author: text('author').notNull(),
    authorId: uuid('author_id'),
    authorIp: text('author_ip'),

    editType: text('edit_type').notNull().default('edit'), // create|edit|revert|redirect|protect|move
    isMinorEdit: boolean('is_minor_edit').notNull().default(false),
    isAutomated: boolean('is_automated').notNull().default(false),

    contentLength: integer('content_length').notNull(),
    sizeChange: integer('size_change').notNull().default(0),

    isReverted: boolean('is_reverted').notNull().default(false),
    revertedBy: text('reverted_by'),
    revertReason: text('revert_reason'),

    isVerified: boolean('is_verified').notNull().default(false),
    verifiedBy: text('verified_by'),

    timestampAt: timestamp('timestamp_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pageRevisionUnique: uniqueIndex('wiki_revisions_page_revnum_unique').on(t.pageId, t.revisionNumber),
    authorIdx: index('wiki_revisions_author_idx').on(t.author),
    timestampIdx: index('wiki_revisions_timestamp_idx').on(t.timestampAt),
  })
)

// ── Wiki 토론 ────────────────────────────────────────────────
export const wikiDiscussions = pgTable(
  'wiki_discussions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pageId: uuid('page_id').notNull().references(() => wikiPages.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    content: text('content').notNull(),

    author: text('author').notNull(),
    authorId: uuid('author_id'),

    category: text('category').notNull().default('general'), // general|content|policy|technical|vandalism|dispute
    priority: text('priority').notNull().default('normal'), // low|normal|high|urgent
    status: text('status').notNull().default('open'), // open|resolved|closed|archived

    replies: jsonb('replies').notNull().default([]).$type<Array<{
      id: string
      content: string
      author: string
      authorId?: string
      timestamp: string
      isDeleted: boolean
      likes: number
      likedBy: string[]
    }>>(),

    views: integer('views').notNull().default(0),
    participants: text('participants').array().notNull().default([]),
    tags: text('tags').array().notNull().default([]),

    isLocked: boolean('is_locked').notNull().default(false),
    lockedBy: text('locked_by'),
    lockReason: text('lock_reason'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pageIdx: index('wiki_discussions_page_idx').on(t.pageId),
    statusIdx: index('wiki_discussions_status_idx').on(t.status),
    categoryIdx: index('wiki_discussions_category_idx').on(t.category),
  })
)

// ── 네임스페이스 (작은 reference 테이블) ─────────────────────
export const wikiNamespaces = pgTable('wiki_namespaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull().unique(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  prefix: text('prefix').notNull(),
  permissions: jsonb('permissions').notNull().default({
    read: [],
    edit: [],
    create: [],
    delete: [],
  }).$type<{
    read: string[]
    edit: string[]
    create: string[]
    delete: string[]
  }>(),
  allowSubpages: boolean('allow_subpages').notNull().default(true),
  isContentNamespace: boolean('is_content_namespace').notNull().default(true),
  hasDiscussion: boolean('has_discussion').notNull().default(true),
  pageCount: integer('page_count').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── Wiki 사이트 설정 (singleton) ──────────────────────────────
export const wikiConfigs = pgTable('wiki_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  siteName: text('site_name').notNull().default('이랑위키'),
  siteDescription: text('site_description').notNull().default('Rangu.fam의 지식 공유 공간'),
  siteUrl: text('site_url'),
  defaultTheme: text('default_theme').notNull().default('light'),
  allowAnonymousEditing: boolean('allow_anonymous_editing').notNull().default(false),
  requireEmailVerification: boolean('require_email_verification').notNull().default(true),
  autoApproveEdits: boolean('auto_approve_edits').notNull().default(true),
  editConflictResolution: text('edit_conflict_resolution').notNull().default('manual'),
  maxEditSummaryLength: integer('max_edit_summary_length').notNull().default(200),
  warnOnLargeEdits: integer('warn_on_large_edits').notNull().default(5000),
  captchaThreshold: integer('captcha_threshold').notNull().default(3),
  rateLimitEdits: integer('rate_limit_edits').notNull().default(10),
  ipBlockDuration: integer('ip_block_duration').notNull().default(24),
  emailNotifications: jsonb('email_notifications').notNull().default({
    watchlistChanges: true,
    mentions: true,
    discussions: true,
  }).$type<{
    watchlistChanges: boolean
    mentions: boolean
    discussions: boolean
  }>(),
  searchEngine: text('search_engine').notNull().default('postgres'),
  indexCategories: boolean('index_categories').notNull().default(true),
  indexDiscussions: boolean('index_discussions').notNull().default(true),
  autoBackup: jsonb('auto_backup').notNull().default({
    enabled: true,
    frequency: 'daily',
    retention: 30,
  }).$type<{
    enabled: boolean
    frequency: string
    retention: number
  }>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── 편집/생성 승인 대기열 ──────────────────────────────────
export const wikiSubmissions = pgTable(
  'wiki_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: text('type').notNull(), // create|edit
    status: text('status').notNull().default('pending'), // pending|approved|rejected|onhold
    reason: text('reason'),
    namespace: text('namespace').notNull().default('main'),
    targetTitle: text('target_title').notNull(),
    targetSlug: text('target_slug').notNull(),
    pageId: uuid('page_id'),
    content: text('content').notNull(),
    summary: text('summary'),
    editSummary: text('edit_summary'),
    categories: text('categories').array().notNull().default([]),
    tags: text('tags').array().notNull().default([]),
    expectedRevision: integer('expected_revision'),
    author: text('author').notNull(),
    authorId: uuid('author_id').notNull(),
    reviewedBy: text('reviewed_by'),
    reviewerId: uuid('reviewer_id'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusCreatedIdx: index('wiki_submissions_status_created_idx').on(t.status, t.createdAt),
    targetSlugStatusIdx: index('wiki_submissions_target_slug_status_idx').on(t.targetSlug, t.status),
  })
)

// ── 인라인 투표 (문서 내 :::poll 위젯) ──────────────────────────
// pollId = (질문+선택지) 해시. 표 정의는 위키 본문에 있고 여기엔 표(vote)만 저장.
// (pollId, voterId) UNIQUE → 1인 1표(재투표 시 갱신).
export const wikiPollVotes = pgTable(
  'wiki_poll_votes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pollId: text('poll_id').notNull(),
    voterId: uuid('voter_id').notNull().references(() => wikiUsers.id, { onDelete: 'cascade' }),
    optionIndex: integer('option_index').notNull(),
    question: text('question'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pollVoterUnique: uniqueIndex('wiki_poll_votes_poll_voter_unique').on(t.pollId, t.voterId),
    pollIdx: index('wiki_poll_votes_poll_idx').on(t.pollId),
  })
)

// ── WikiWorkshopStatement ──────────────────────────────────
export const wikiWorkshopStatements = pgTable(
  'wiki_workshop_statements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    // 원본 데이터에 맞춰 동적 jsonb로 보관 (별도 모델 단순)
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  }
)

export type WikiUser = typeof wikiUsers.$inferSelect
export type NewWikiUser = typeof wikiUsers.$inferInsert
export type WikiPage = typeof wikiPages.$inferSelect
export type NewWikiPage = typeof wikiPages.$inferInsert
export type WikiPageViewDaily = typeof wikiPageViewDaily.$inferSelect
export type WikiRevision = typeof wikiRevisions.$inferSelect
export type WikiDiscussion = typeof wikiDiscussions.$inferSelect
export type WikiNamespace = typeof wikiNamespaces.$inferSelect
export type WikiConfig = typeof wikiConfigs.$inferSelect
export type WikiSubmission = typeof wikiSubmissions.$inferSelect
