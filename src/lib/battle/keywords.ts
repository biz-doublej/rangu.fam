/** 키워드 UI 표시 메타 (한글명·이모지·설명) — 엔진 로직과 분리된 표시 전용. */
import type { Keyword } from './types'

export const KEYWORD_INFO: Record<Keyword, { ko: string; emoji: string; desc: string }> = {
  overwhelm: { ko: '일격', emoji: '💥', desc: '막은 유닛을 죽이고 남은 피해는 본진 관통' },
  elusive: { ko: '잠행', emoji: '👻', desc: '잠행 유닛으로만 막을 수 있음' },
  quickAttack: { ko: '속공', emoji: '⚡', desc: '전투 시 먼저 타격 (상대가 죽으면 반격 없음)' },
  lifesteal: { ko: '흡혈', emoji: '🩸', desc: '가한 피해만큼 본진 회복' },
  tough: { ko: '끈질김', emoji: '🛡️', desc: '받는 피해 -1' },
  barrier: { ko: '보호막', emoji: '✨', desc: '다음 피해 1회 무효' },
  fearsome: { ko: '위압', emoji: '😱', desc: '파워 3 이상 유닛으로만 막을 수 있음' },
  challenger: { ko: '도발', emoji: '🎯', desc: '공격 시 막을 적을 지정해 끌어냄' },
  regeneration: { ko: '재생', emoji: '🌱', desc: '라운드 종료 시 체력 전부 회복' },
}

export function keywordLabel(k: Keyword): string {
  return KEYWORD_INFO[k]?.ko ?? k
}
