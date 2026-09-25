/**
 * 카드 개봉 연출 사운드 매니저(싱글톤) — SFX + 배경음악.
 *
 * - 브라우저 자동재생 정책: 유저 제스처(사운드 토글 클릭)로 setEnabled(true) 후에만 재생.
 * - 파일이 없거나(404) 정책에 막히면 play() 가 reject → 조용히 무시(무해). 에셋은 아래 경로에 드롭.
 * - SSR 안전: typeof Audio 가드(모듈 import 시 Audio 미접근).
 */
const SFX: Record<string, string> = {
  packOpen: '/assets/sfx/sfx_pack_open.mp3', // 가챠 팩 개봉(폭발)
  flip: '/assets/sfx/sfx_card_flip.mp3', // 카드 플립(스위시)
  rareAura: '/assets/sfx/sfx_rare_aura.mp3', // 레어/프레스티지 오라(공명)
}
const SFX_VOLUME = 0.6

class SoundManager {
  private enabled = false
  private buffers: Record<string, HTMLAudioElement> = {} // 프리로드 템플릿(재생 시 clone)

  get isEnabled(): boolean {
    return this.enabled
  }

  /** SFX만 활성 — 가챠 등 비전투 화면용. 유저 제스처(개봉 클릭) 직후 호출. */
  enableSfx(): void {
    this.enabled = true
    if (typeof Audio !== 'undefined') this.preload()
  }

  setEnabled(on: boolean): void {
    this.enabled = on
    if (on && typeof Audio !== 'undefined') this.preload()
  }

  /** SFX 1회 재생(겹침 허용 — clone). 비활성/파일없음 → 무시. */
  play(key: keyof typeof SFX | string): void {
    if (!this.enabled || typeof Audio === 'undefined') return
    const src = SFX[key]
    if (!src) return
    try {
      const tmpl = this.buffers[key]
      const a = (tmpl?.cloneNode() as HTMLAudioElement | undefined) ?? new Audio(src)
      a.volume = SFX_VOLUME
      void a.play().catch(() => {}) // 파일 없음/정책 → 무시
    } catch {
      /* no-op */
    }
  }

  private preload(): void {
    if (typeof Audio === 'undefined') return
    for (const [k, src] of Object.entries(SFX)) {
      if (this.buffers[k]) continue
      const a = new Audio(src)
      a.preload = 'auto'
      a.volume = SFX_VOLUME
      this.buffers[k] = a
    }
  }
}

export const soundManager = new SoundManager()
