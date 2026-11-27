import { liarGame } from '../liar/rules'
import { omokGame } from '../omok/rules'
import { quizGame } from '../quiz/rules'
import type { RoomGame } from './base'

/** 방에서 할 수 있는 게임 (단계가 진행되며 늘어난다) */
export const ROOM_GAMES: Record<string, RoomGame> = {
  [omokGame.id]: omokGame,
  [liarGame.id]: liarGame,
  [quizGame.id]: quizGame,
}

export function findRoomGame(id: unknown): RoomGame | null {
  return typeof id === 'string' && Object.prototype.hasOwnProperty.call(ROOM_GAMES, id) ? ROOM_GAMES[id] : null
}
