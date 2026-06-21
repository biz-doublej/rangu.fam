// 개발 전용 — WS 스모크 클라이언트. Node 20+ 의 내장 WebSocket/fetch 사용.
// 메타데이터 버전을 가져와 connect → connect_accepted → echo 왕복을 확인한다.
//
// 실행: node game/rangu-tactics-server/smoke-client.mjs "<ticket>"
const WS_URL = process.env.WS_URL || 'ws://localhost:5080/ws/tactics'
const METADATA_URL = process.env.METADATA_URL || 'http://localhost:3000/api/game/metadata/export'
const ticket = process.argv[2] || process.env.GAME_TICKET

if (!ticket) {
  console.error('usage: node smoke-client.mjs "<ticket>"  (mint-test-ticket.mjs 로 발급)')
  process.exit(1)
}

const meta = await (await fetch(METADATA_URL)).json()
console.log('metadata contentVersion =', meta.contentVersion, `(cards: ${meta.cardCount})`)

const ws = new WebSocket(WS_URL)

ws.addEventListener('open', () => {
  console.log('→ connect (metadataVersion 일치 전송)')
  ws.send(JSON.stringify({ gameTicket: ticket, matchId: 'smoke-1', metadataVersion: meta.contentVersion }))
})

ws.addEventListener('message', (e) => {
  console.log('←', e.data)
  const msg = JSON.parse(e.data)
  if (msg.type === 'connect_accepted') {
    console.log('→ echo 테스트 전송')
    ws.send(JSON.stringify({ ping: 'hello tactics' }))
  } else if (msg.type === 'echo') {
    console.log('✅ echo round-trip OK — 인증 seam 통과')
    ws.close()
  } else if (msg.type === 'connect_rejected') {
    console.error('❌ rejected:', msg.reason, msg.detail || msg.current || '')
    ws.close()
    process.exitCode = 1
  }
})

ws.addEventListener('close', () => process.exit(process.exitCode ?? 0))
ws.addEventListener('error', (e) => {
  console.error('ws error:', e?.message || e)
  process.exit(1)
})
