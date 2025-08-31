// 데모용 메모리 감사 로그 저장
const logs: Array<{ ts: number; actor?: string; action: string; meta?: any }> = []

export function appendAuditLog(entry: { actor?: string; action: string; meta?: any }) {
  logs.push({ ts: Date.now(), ...entry })
}

export function getAuditLogs() {
  return logs.slice(-500)
}
