import type { ClimbMap } from './engine'
import data from './map.json'

/** 랑구 등반 맵 (구역 8개). scripts/gamecenter/generate-climb-map.ts 로 만든다. */
export const CLIMB_MAP = data as ClimbMap

export const CLIMB_SUMMIT_HEIGHT = Math.max(...CLIMB_MAP.platforms.map((platform) => platform.h))
