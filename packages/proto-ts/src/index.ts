// @rangu/proto-ts — C# 서버와 단일 proto 계약을 공유하는 생성 TS 타입.
// `npm run gen`(buf + ts-proto) 후 사용. ts-proto 가 파일마다 헬퍼(protobufPackage 등)를
// export 하므로 export * 대신 메시지 타입만 명시 re-export (충돌 회피, FE 는 flat import).
//   import { ServerMessage, GameStateSnapshot, CardView } from '@rangu/proto-ts'

export { ServerMessage, ClientMessage, ConnectRequest, ConnectAccepted, ConnectRejected, ResyncRequest, Heartbeat } from './gen/rangu/tactics/v1/service'
export { PlayerRef, Zone, Keyword, Target } from './gen/rangu/tactics/v1/common'
export { CardView, RevealedCard, HiddenCard, CardModifier } from './gen/rangu/tactics/v1/card'
export { GameStateSnapshot, GamePhase, PlayerState, StackItem, CombatState, CombatPair } from './gen/rangu/tactics/v1/state'
export { Intent, MulliganIntent, PlayCardIntent, ChallengerPull, DeclareAttackIntent, BlockAssignment, DeclareBlockIntent, PassIntent, ResolveStackIntent, SelectTargetsIntent, ConcedeIntent } from './gen/rangu/tactics/v1/intent'
export { Event, IntentAckEvent, IntentRejectedEvent } from './gen/rangu/tactics/v1/event'
