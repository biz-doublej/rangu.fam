// 랑구 택틱스 임시 플레이스홀더 로고 생성기 (레오나르도 마스코트 준비 전까지).
// node-canvas(네이티브) 대신 이미 설치된 sharp 로 SVG → 1024² PNG 래스터.
//   실행: node scripts/gen-tactics-logo.js  → public/assets/logo.png
//   이후: npx tauri icon public/assets/logo.png 로 아이콘 풀셋 갱신.
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

// 다크 슬레이트 라운드 타일 + 골드 'R' + 로즈 액센트 프레임 (택틱스 테마)
const svg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e293b"/>
      <stop offset="100%" stop-color="#0b1120"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fcd34d"/>
      <stop offset="100%" stop-color="#f59e0b"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="1024" height="1024" rx="190" fill="url(#bg)"/>
  <rect x="46" y="46" width="932" height="932" rx="156" fill="none" stroke="#f43f5e" stroke-opacity="0.4" stroke-width="16"/>
  <!-- resvg 가 dominant-baseline 을 무시 → 베이스라인 직접 보정(cap 중심이 512 오도록 y≈742) -->
  <text x="512" y="742" font-family="Arial, Helvetica, sans-serif" font-size="640" font-weight="bold"
        fill="url(#gold)" text-anchor="middle">R</text>
</svg>`

const out = path.join('public', 'assets', 'logo.png')
fs.mkdirSync(path.dirname(out), { recursive: true })
sharp(Buffer.from(svg))
  .resize(1024, 1024)
  .png()
  .toFile(out)
  .then((info) => console.log(`✅ 로고 생성: ${out} (${info.width}x${info.height}, ${info.size}B)`))
  .catch((e) => {
    console.error('로고 생성 실패:', e)
    process.exit(1)
  })
