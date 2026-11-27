/**
 * 이랑게임센터 보상 규칙 표.
 * 포인트 숫자는 이 파일 한 곳에만 둔다 (기획안 ‘포인트 획득 규칙’ 표와 같게).
 * 운영하며 조정할 때도 여기만 고친다.
 */

/** 하루 게임 보상 상한 (KST 날짜 기준). 출석·주간 랭킹 등 공통 보상은 상한 밖이다. */
export const DAILY_GAME_CAP = 300

/** 게임 한 종류가 로비에 어떻게 보이는지 */
export const GAME_IDS = ['claw', 'tetris', 'climb', 'quiz', 'liar', 'catchmind', 'ladder', 'omok', 'yut'] as const
export type GameId = (typeof GAME_IDS)[number]

/** 게임별 보상 */
export const GAME_REWARDS = {
  claw: {
    /** 1회 플레이 비용 (사용처) */
    playCost: 20,
    /** 도감에 처음 등록되는 인형 — 종류당 1회 */
    newPlush: 50,
    /** 황금 랑구 획득 */
    goldenRangu: 100,
  },
  tetris: {
    /** 한 판 완료 (1분 이상) — 하루 10판까지 */
    clear: 5,
    clearMinSeconds: 60,
    clearPerDay: 10,
    /** 점수 1만 점마다 — 판당 최대 +40P */
    per10kScore: 5,
    per10kScoreMaxPerRun: 40,
    /** 4줄 동시 제거 — 판당 최대 +30P */
    tetris: 3,
    tetrisMaxPerRun: 30,
    /** 개인 최고 기록 경신 — 하루 1회 */
    personalBest: 20,
    personalBestPerDay: 1,
  },
  climb: {
    /** 5분 이상 플레이 — 하루 3회 */
    play: 5,
    playMinSeconds: 300,
    playPerDay: 3,
    /** 새 구역 처음 도달 — 구역당 1회 */
    newZone: 30,
    /** 정상 처음 도달 — 1회 */
    summit: 500,
    /** 기존 완주 기록 단축 — 하루 1회 */
    fasterClear: 50,
    fasterClearPerDay: 1,
  },
  quiz: {
    /** 참가 (끝까지) — 사람 3명 이상일 때만 */
    participate: 10,
    minPlayers: 3,
    correct: 2,
    /** 1위 / 2위 / 3위 */
    rank: [50, 30, 15],
    /** 주인공 예측 적중 */
    predictionHit: 10,
    /** 내 문제가 게임에 쓰임 — 하루 30P */
    questionUsed: 3,
    questionUsedMaxPerDay: 30,
  },
  liar: {
    /** 참가 — 3명 이상 */
    participate: 10,
    minPlayers: 3,
    winAsLiar: 40,
    winAsCitizen: 20,
  },
  catchmind: {
    /** 참가 — 3명 이상 */
    participate: 10,
    minPlayers: 3,
    correct: 5,
    /** 먼저 맞힐수록 추가 */
    earlyBonus: 3,
    /** 내 그림을 누군가 맞힘 — 맞힌 사람 1명당 */
    drawingGuessedPerPlayer: 3,
  },
  omok: {
    win: 20,
    lose: 5,
    /** 같은 상대와는 하루 3판까지 보상 */
    rewardedGamesPerOpponentPerDay: 3,
    /** 이보다 적게 두고 끝난 판(바로 기권 등)은 보상이 없다 — 다섯 알을 놓으려면 최소 9수 */
    minMovesForReward: 9,
  },
  yut: {
    participate: 10,
    win: 30,
  },
  /** 도구라 보상 없음 */
  ladder: {},
} as const

/** 공통 보상 — 하루 상한 밖 */
export const COMMON_REWARDS = {
  /** 하루 첫 접속 (KST 기준) */
  dailyCheckIn: 10,
  /** 7일 연속 출석 */
  streak7: 70,
  streakLength: 7,
  /** 하루 서로 다른 게임 3종 플레이 */
  threeGamesInDay: 20,
  threeGamesCount: 3,
  /** 주간 테트리스·등반 랭킹 1위 / 2위 / 3위 (월요일 0시 KST 정산) */
  weeklyRank: [200, 100, 50],
  /** 이번 주 가장 크게 떨어진 사람 (등반) — 위로금 */
  weeklyBiggestFall: 50,
} as const

/** 원장 reason 값 */
export const REASONS = {
  checkIn: 'checkin',
  streak7: 'checkin.streak7',
  shopPurchase: 'shop.purchase',
  shopRefund: 'shop.refund',
  adminAdjust: 'admin.adjust',
  clawPlay: 'claw.play',
  clawNewPlush: 'claw.dex',
  clawGold: 'claw.gold',
  tetrisClear: 'tetris.clear',
  tetrisScore: 'tetris.score',
  tetrisTetris: 'tetris.tetris',
  tetrisBest: 'tetris.best',
  climbPlay: 'climb.play',
  climbZone: 'climb.zone',
  climbSummit: 'climb.summit',
  climbFaster: 'climb.faster',
  weeklyRank: 'weekly.rank',
  weeklyFall: 'weekly.fall',
  omokWin: 'omok.win',
  omokLose: 'omok.lose',
  omokDraw: 'omok.draw',
  quizPlay: 'quiz.play',
  quizCorrect: 'quiz.correct',
  quizRank: 'quiz.rank',
  quizPredict: 'quiz.predict',
  quizUsed: 'quiz.used',
  liarPlay: 'liar.play',
  liarWin: 'liar.win',
} as const

/**
 * 하루 상한을 적용했을 때 실제로 지급할 금액.
 * 초과분은 잘라낸다 (예: 오늘 290P 를 받았으면 +50P 는 +10P 만).
 */
export function clampToDailyCap(amount: number, earnedToday: number, cap: number = DAILY_GAME_CAP): number {
  const remaining = Math.max(0, cap - Math.max(0, earnedToday))
  return Math.max(0, Math.min(amount, remaining))
}

/** 연속 출석이 7일째(14일째, 21일째 …)인지 */
export function isStreakBonusDay(streakDays: number): boolean {
  return streakDays > 0 && streakDays % COMMON_REWARDS.streakLength === 0
}

/** 테트리스 한 판의 점수·4줄 보상 (판당 상한 적용). 완료·최고 기록 보상은 하루 횟수 제한이 있어 서버가 따로 본다. */
export function tetrisRunBonuses(result: { score: number; tetrises: number; frames: number }) {
  const rule = GAME_REWARDS.tetris
  return {
    /** 한 판 완료 보상을 받을 만큼 오래 했는지 (1분 이상) */
    longEnough: result.frames >= rule.clearMinSeconds * 60,
    score: Math.min(rule.per10kScoreMaxPerRun, Math.floor(result.score / 10_000) * rule.per10kScore),
    tetris: Math.min(rule.tetrisMaxPerRun, result.tetrises * rule.tetris),
  }
}

/** 랑구 등반 랭킹 점수: 완주한 판은 빠를수록, 아니면 높이 올라갈수록 높다. */
export const CLIMB_COMPLETED_BASE = 1_000_000_000
export function climbRankScore(result: { maxHeight: number; completedAt: number | null }): number {
  return result.completedAt !== null ? CLIMB_COMPLETED_BASE - result.completedAt : result.maxHeight
}
