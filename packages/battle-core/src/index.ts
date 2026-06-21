// @rangu/battle-core — FE 상태 코어 (프레임워크 비의존).
// React 앱은 createBattleStore() 로 스토어를 만들고 useStore(store, selector) 로 구독,
// attachMessageMapper(ws, store) 로 서버 스트림을 연결한다.
export { createBattleStore } from './battleStore'
export type { BattleState, BattleStore, PendingIntent, IntentStatus } from './battleStore'
export { attachMessageMapper, toBytes } from './messageMapper'
export type { SocketLike } from './messageMapper'
