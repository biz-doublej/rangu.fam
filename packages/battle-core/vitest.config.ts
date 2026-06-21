import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 워크스페이스 의존(@rangu/proto-ts)의 TS 소스를 vitest 가 변환하도록 inline
    server: { deps: { inline: [/@rangu\/proto-ts/] } },
  },
})
