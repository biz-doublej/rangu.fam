/**
 * 이랑게임센터 DDL + 상점 초기 상품.
 * /api/admin/maintenance/gamecenter 와 통합 테스트가 같은 문장을 쓴다.
 * 모두 IF NOT EXISTS / ON CONFLICT DO NOTHING 이라 여러 번 실행해도 결과가 같다.
 * (src/db/schema/gamecenter.ts 의 Drizzle 스키마와 같은 모양을 유지할 것)
 */

export const GC_TABLES = [
  'gc_wallets',
  'gc_point_ledger',
  'gc_runs',
  'gc_matches',
  'gc_shop_items',
  'gc_orders',
  'gc_inventory',
  'gc_quiz_self_answers',
] as const

export const GC_DDL_STATEMENTS: string[] = [
  // 지갑: 잔액 사본 (원장 합계와 항상 같아야 함)
  `CREATE TABLE IF NOT EXISTS gc_wallets (
    user_id uuid PRIMARY KEY REFERENCES wiki_users(id) ON DELETE CASCADE,
    balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
    lifetime_earned integer NOT NULL DEFAULT 0,
    streak_days integer NOT NULL DEFAULT 0,
    last_check_in date,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  // 원장: 적립(+)·사용(-) 모두 한 줄씩, 수정·삭제 없음
  `CREATE TABLE IF NOT EXISTS gc_point_ledger (
    id bigserial PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES wiki_users(id) ON DELETE CASCADE,
    amount integer NOT NULL,
    reason text NOT NULL,
    game text,
    ref_id text,
    idempotency_key text NOT NULL UNIQUE,
    counts_to_daily_cap boolean NOT NULL DEFAULT true,
    kst_day date NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS gc_point_ledger_user_id_kst_day_idx ON gc_point_ledger (user_id, kst_day)`,
  // 아케이드 한 판
  `CREATE TABLE IF NOT EXISTS gc_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES wiki_users(id) ON DELETE CASCADE,
    game text NOT NULL,
    seed bigint NOT NULL,
    status text NOT NULL DEFAULT 'started',
    score integer,
    stats jsonb NOT NULL DEFAULT '{}',
    started_at timestamptz NOT NULL DEFAULT now(),
    finished_at timestamptz
  )`,
  `CREATE INDEX IF NOT EXISTS gc_runs_game_score_idx ON gc_runs (game, score DESC)`,
  // 파티·보드 한 판 결과
  `CREATE TABLE IF NOT EXISTS gc_matches (
    id uuid PRIMARY KEY,
    game text NOT NULL,
    players jsonb NOT NULL,
    summary jsonb NOT NULL DEFAULT '{}',
    finished_at timestamptz NOT NULL DEFAULT now()
  )`,
  // 상점
  `CREATE TABLE IF NOT EXISTS gc_shop_items (
    id text PRIMARY KEY,
    name text NOT NULL,
    description text NOT NULL DEFAULT '',
    kind text NOT NULL,
    price integer NOT NULL CHECK (price > 0),
    payload jsonb NOT NULL DEFAULT '{}',
    stock integer,
    limit_per_period integer,
    limit_period text,
    active boolean NOT NULL DEFAULT true,
    sort_order integer NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS gc_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES wiki_users(id) ON DELETE CASCADE,
    item_id text NOT NULL REFERENCES gc_shop_items(id),
    price integer NOT NULL,
    status text NOT NULL DEFAULT 'fulfilled',
    created_at timestamptz NOT NULL DEFAULT now(),
    resolved_at timestamptz,
    resolved_by uuid
  )`,
  `CREATE INDEX IF NOT EXISTS gc_orders_user_id_item_id_idx ON gc_orders (user_id, item_id)`,
  // 보유품
  `CREATE TABLE IF NOT EXISTS gc_inventory (
    user_id uuid NOT NULL REFERENCES wiki_users(id) ON DELETE CASCADE,
    item_key text NOT NULL,
    quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 0),
    equipped boolean NOT NULL DEFAULT false,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, item_key)
  )`,
  // 퀴즈 배틀 문제 은행
  `CREATE TABLE IF NOT EXISTS gc_quiz_self_answers (
    user_id uuid NOT NULL REFERENCES wiki_users(id) ON DELETE CASCADE,
    prompt_id text NOT NULL,
    answer jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, prompt_id)
  )`,
]

export interface ShopSeedItem {
  id: string
  name: string
  description: string
  kind: 'inventory' | 'title' | 'wiki_color' | 'coupon'
  price: number
  payload: { itemKey: string; amount?: number; [key: string]: unknown }
  stock: number | null
  limitPerPeriod: number | null
  limitPeriod: 'day' | 'week' | 'month' | 'once' | null
  sortOrder: number
}

const CLIMB_SKINS = [
  { id: 'hanul', name: '강한울' },
  { id: 'jaewon', name: '정재원' },
  { id: 'minseok', name: '정민석' },
  { id: 'seungchan', name: '이승찬' },
  { id: 'jinkyu', name: '정진규' },
]

/**
 * 상점 초기 상품 (기획안 ‘상점’ 표).
 * 현금성 상품(기프티콘·상품권·현금)은 넣지 않는다 — 표의 ‘편의점 상품권’ 줄은 시드하지 않았다.
 * 이미 있는 id 는 건드리지 않으므로, 관리자 화면에서 바꾼 가격·재고가 다시 덮이지 않는다.
 */
export const SHOP_SEED: ShopSeedItem[] = [
  {
    id: 'claw-ticket-3',
    name: '인형뽑기 무료권 3회',
    description: '인형뽑기를 포인트 없이 3번 할 수 있습니다.',
    kind: 'inventory',
    price: 50,
    payload: { itemKey: 'claw-ticket', amount: 3 },
    stock: null,
    limitPerPeriod: null,
    limitPeriod: null,
    sortOrder: 10,
  },
  {
    id: 'tetris-skin-neon',
    name: '테트리스 블록 스킨 · 네온',
    description: '테트리스 블록이 네온 색으로 바뀝니다.',
    kind: 'inventory',
    price: 400,
    payload: { itemKey: 'skin:tetris:neon' },
    stock: null,
    limitPerPeriod: 1,
    limitPeriod: 'once',
    sortOrder: 20,
  },
  ...CLIMB_SKINS.map((member, index) => ({
    id: `climb-skin-${member.id}`,
    name: `등반 캐릭터 스킨 · ${member.name}`,
    description: `랑구 등반 캐릭터가 ${member.name} 모습으로 바뀝니다.`,
    kind: 'inventory' as const,
    price: 600,
    payload: { itemKey: `skin:climb:${member.id}` },
    stock: null,
    limitPerPeriod: 1,
    limitPeriod: 'once' as const,
    sortOrder: 30 + index,
  })),
  {
    id: 'title-tetris-master',
    name: '칭호 · 테트리스 장인',
    description: '게임센터 프로필에 표시되는 칭호입니다.',
    kind: 'title',
    price: 500,
    payload: { itemKey: 'title:tetris-master', title: '테트리스 장인' },
    stock: null,
    limitPerPeriod: 1,
    limitPeriod: 'once',
    sortOrder: 40,
  },
  {
    id: 'wiki-color-30d',
    name: '이랑위키 닉네임 색 (30일)',
    description: '이랑위키 토론·역사에서 닉네임에 색이 표시됩니다. 교환한 날부터 30일.',
    kind: 'wiki_color',
    price: 800,
    payload: { itemKey: 'wiki-color', days: 30 },
    stock: null,
    limitPerPeriod: 1,
    limitPeriod: 'month',
    sortOrder: 50,
  },
  {
    id: 'quiz-penalty-pass',
    name: '퀴즈 배틀 벌칙 면제권',
    description: '다음 벌칙 룰렛을 한 번 건너뜁니다.',
    kind: 'inventory',
    price: 300,
    payload: { itemKey: 'quiz-penalty-pass' },
    stock: null,
    limitPerPeriod: 1,
    limitPeriod: 'week',
    sortOrder: 60,
  },
  {
    id: 'plush-season-1',
    name: '시즌 한정 인형',
    description: '이번 시즌에만 교환할 수 있는 인형입니다. 도감에 등록됩니다.',
    kind: 'inventory',
    price: 2000,
    payload: { itemKey: 'plush:season-1' },
    stock: 10,
    limitPerPeriod: 1,
    limitPeriod: 'once',
    sortOrder: 70,
  },
]

function quote(value: string): string {
  return `'${value.replace(/'/g, "''")}'`
}

/** 상점 초기 상품 INSERT 문 (이미 있는 id 는 건너뜀) */
export function shopSeedStatements(items: ShopSeedItem[] = SHOP_SEED): string[] {
  return items.map(
    (item) =>
      `INSERT INTO gc_shop_items (id, name, description, kind, price, payload, stock, limit_per_period, limit_period, sort_order)
       VALUES (${quote(item.id)}, ${quote(item.name)}, ${quote(item.description)}, ${quote(item.kind)}, ${item.price},
               ${quote(JSON.stringify(item.payload))}::jsonb, ${item.stock ?? 'NULL'}, ${item.limitPerPeriod ?? 'NULL'},
               ${item.limitPeriod ? quote(item.limitPeriod) : 'NULL'}, ${item.sortOrder})
       ON CONFLICT (id) DO NOTHING`
  )
}
