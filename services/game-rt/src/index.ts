import { loadConfig } from './config'
import { createReporter } from './report'
import { createRtServer } from './server'

const config = loadConfig()
const server = createRtServer({
  jwtSecret: config.jwtSecret,
  allowedOrigins: config.allowedOrigins,
  report: createReporter({ ranguFamUrl: config.ranguFamUrl, internalSecret: config.internalSecret }),
})

server.http.listen(config.port, () => {
  console.log(`[game-rt] ${config.port} 포트에서 대기 — 결과 보고 대상 ${config.ranguFamUrl}`)
})

// Cloud Run 은 내리기 전에 SIGTERM 을 보낸다
process.on('SIGTERM', () => {
  console.log('[game-rt] 종료 신호 — 연결을 닫습니다.')
  server.close().then(() => process.exit(0))
})
