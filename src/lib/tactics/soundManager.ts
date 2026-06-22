/**
 * 택틱스 사운드 매니저(싱글톤) — combatFx → SFX + 배경음악.
 *
 * - 브라우저 자동재생 정책: 유저 제스처(사운드 토글 클릭)로 setEnabled(true) 후에만 재생.
 * - 파일이 없거나(404) 정책에 막히면 play() 가 reject → 조용히 무시(무해). 에셋은 아래 경로에 드롭.
 * - SSR 안전: typeof Audio 가드(모듈 import 시 Audio 미접근).
 */
const SFX: Record<string, string> = {
  hit: '/assets/sfx/sfx_hit.mp3', // damage
  death: '/assets/sfx/sfx_death.mp3', // unit death
  nexus: '/assets/sfx/sfx_nexus.mp3', // nexus damage
}
const BGM_SRC = '/assets/sfx/bgm_battle.mp3'
const SFX_VOLUME = 0.6
const BGM_VOLUME = 0.32

class SoundManager {
  private enabled = false
  private bgm?: HTMLAudioElement
  private buffers: Record<string, HTMLAudioElement> = {} // 프리로드 템플릿(재생 시 clone)

  get isEnabled(): boolean {
    return this.enabled
  }

  /** 유저 제스처에서 호출 — 활성/비활성. 활성 시 프리로드 + BGM 시작. */
  setEnabled(on: boolean): void {
    this.enabled = on
    if (typeof Audio === 'undefined') return
    if (on) {
      this.preload()
      this.startBgm()
    } else {
      this.stopBgm()
    }
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

  stopBgm(): void {
    this.bgm?.pause()
  }

  private startBgm(): void {
    if (typeof Audio === 'undefined' || !this.enabled) return
    if (!this.bgm) {
      this.bgm = new Audio(BGM_SRC)
      this.bgm.loop = true
      this.bgm.volume = BGM_VOLUME
    }
    void this.bgm.play().catch(() => {})
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
