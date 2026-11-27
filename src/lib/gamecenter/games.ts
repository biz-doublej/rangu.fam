import type { GameId } from './rewards'

/** 로비에 보이는 게임 목록 (기획안 ‘게임 라인업’ 1차 9종) */
export interface GameInfo {
  id: GameId
  name: string
  category: '아케이드' | '파티' | '보드'
  description: string
  players: string
  /** 화면 경로 (/wiki/game 기준). 아직 없으면 null → ‘준비 중’ */
  href: string | null
}

export const GAMES: GameInfo[] = [
  { id: 'claw', name: '인형뽑기', category: '아케이드', description: '포인트를 넣고 랑구 인형 뽑기, 도감 수집', players: '1명', href: '/wiki/game/claw' },
  { id: 'tetris', name: '테트리스', category: '아케이드', description: '혼자 하는 랭킹전', players: '1명', href: '/wiki/game/tetris' },
  { id: 'climb', name: '랑구 등반', category: '아케이드', description: '힘을 모아 점프하는 수직 등반, 체크포인트 없음', players: '1명', href: '/wiki/game/climb' },
  { id: 'quiz', name: '퀴즈 배틀', category: '파티', description: '친구에 대한 퀴즈, 누가 그랬을까', players: '3~8명', href: '#rooms' },
  { id: 'liar', name: '라이어 게임', category: '파티', description: '제시어를 모르는 한 명 찾기', players: '3~8명', href: '#rooms' },
  { id: 'catchmind', name: '캐치마인드', category: '파티', description: '그림 그리고 맞히기', players: '3~8명', href: '#rooms' },
  { id: 'ladder', name: '사다리 타기', category: '보드', description: '계산·벌칙 정하기 (보상 없음)', players: '2~10명', href: '/wiki/game/ladder' },
  { id: 'omok', name: '오목', category: '보드', description: '1대1 턴제 (방을 만들어 친구와)', players: '2명', href: '#rooms' },
  { id: 'yut', name: '윷놀이', category: '보드', description: '2~4명 개인전 또는 2팀', players: '2~4명', href: '#rooms' },
]

/** 원장 reason → 화면에 보일 말 */
const REASON_LABELS: Record<string, string> = {
  checkin: '출석',
  'checkin.streak7': '7일 연속 출석',
  'shop.purchase': '상점 교환',
  'shop.refund': '교환 취소 환불',
  'admin.adjust': '관리자 조정',
  'claw.play': '1회 플레이',
  'claw.dex': '도감 첫 등록',
  'claw.gold': '황금 랑구 획득',
  'tetris.clear': '한 판 완료',
  'tetris.score': '점수 보너스',
  'tetris.tetris': '4줄 제거 보너스',
  'tetris.best': '개인 최고 기록',
  'climb.play': '5분 이상 플레이',
  'climb.zone': '새 구역 도달',
  'climb.summit': '정상 첫 도달',
  'climb.faster': '완주 기록 단축',
  'weekly.rank': '주간 랭킹 보상',
  'weekly.fall': '이번 주 가장 크게 떨어진 사람',
  'omok.win': '승리',
  'omok.lose': '패배',
  'omok.draw': '무승부',
  'quiz.play': '참가',
  'quiz.correct': '정답',
  'quiz.rank': '순위 보상',
  'quiz.predict': '주인공 예측 적중',
  'quiz.used': '내 문제가 게임에 쓰임',
  'liar.play': '참가',
  'liar.win': '승리',
  'catchmind.play': '참가',
  'catchmind.correct': '정답',
  'catchmind.first': '가장 먼저 맞힘',
  'catchmind.drawn': '내 그림을 맞힘',
  'yut.play': '참가',
  'yut.win': '승리',
}

export function reasonLabel(reason: string): string {
  return REASON_LABELS[reason] || reason
}
