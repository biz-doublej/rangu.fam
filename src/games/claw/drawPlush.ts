import type { PlushType } from './plushes'

/** 인형 한 개를 (0,0) 중심, 반지름 r 로 그린다. 기계 안·도감·획득 알림이 같이 쓴다. */
export function drawPlush(c: CanvasRenderingContext2D, type: PlushType, r: number) {
  const { animal, color, dark } = type
  const TAU = Math.PI * 2
  c.lineWidth = 2.4
  c.strokeStyle = dark
  c.fillStyle = color
  const ear = (x: number, y: number, rx: number, ry: number, rot = 0) => {
    c.beginPath()
    c.ellipse(x, y, rx, ry, rot, 0, TAU)
    c.fill()
    c.stroke()
  }
  if (animal === 'bear') {
    ear(-r * 0.62, -r * 0.7, r * 0.3, r * 0.3)
    ear(r * 0.62, -r * 0.7, r * 0.3, r * 0.3)
  }
  if (animal === 'rabbit') {
    ear(-r * 0.38, -r * 1.05, r * 0.2, r * 0.55, -0.15)
    ear(r * 0.38, -r * 1.05, r * 0.2, r * 0.55, 0.15)
  }
  if (animal === 'cat') {
    for (const s of [-1, 1]) {
      c.beginPath()
      c.moveTo(s * r * 0.85, -r * 0.25)
      c.lineTo(s * r * 0.62, -r * 1.05)
      c.lineTo(s * r * 0.15, -r * 0.8)
      c.closePath()
      c.fill()
      c.stroke()
    }
  }
  if (animal === 'frog') {
    ear(-r * 0.45, -r * 0.78, r * 0.32, r * 0.3)
    ear(r * 0.45, -r * 0.78, r * 0.32, r * 0.3)
  }

  // 몸
  c.beginPath()
  c.arc(0, 0, r, 0, TAU)
  c.fill()
  c.stroke()
  if (animal === 'penguin') {
    c.fillStyle = '#fff'
    c.beginPath()
    c.ellipse(0, r * 0.15, r * 0.68, r * 0.72, 0, 0, TAU)
    c.fill()
  }
  if (animal === 'bear') {
    c.fillStyle = 'rgba(255,255,255,.55)'
    c.beginPath()
    c.ellipse(0, r * 0.32, r * 0.42, r * 0.3, 0, 0, TAU)
    c.fill()
  }

  // 눈
  if (animal === 'frog') {
    for (const s of [-1, 1]) {
      c.fillStyle = '#fff'
      c.beginPath()
      c.arc(s * r * 0.45, -r * 0.8, r * 0.17, 0, TAU)
      c.fill()
      c.fillStyle = '#2a1a22'
      c.beginPath()
      c.arc(s * r * 0.45, -r * 0.78, r * 0.09, 0, TAU)
      c.fill()
    }
  } else {
    c.fillStyle = '#2a1a22'
    for (const s of [-1, 1]) {
      c.beginPath()
      c.arc(s * r * 0.33, -r * 0.08, r * 0.1, 0, TAU)
      c.fill()
    }
    c.fillStyle = '#fff'
    for (const s of [-1, 1]) {
      c.beginPath()
      c.arc(s * r * 0.33 - r * 0.03, -r * 0.12, r * 0.035, 0, TAU)
      c.fill()
    }
  }

  // 볼
  c.fillStyle = 'rgba(255,90,130,.45)'
  for (const s of [-1, 1]) {
    c.beginPath()
    c.ellipse(s * r * 0.58, r * 0.18, r * 0.14, r * 0.09, 0, 0, TAU)
    c.fill()
  }

  // 입 / 부리
  if (animal === 'penguin') {
    c.fillStyle = '#ffb02e'
    c.beginPath()
    c.moveTo(-r * 0.12, r * 0.1)
    c.lineTo(r * 0.12, r * 0.1)
    c.lineTo(0, r * 0.26)
    c.closePath()
    c.fill()
  } else {
    c.strokeStyle = '#2a1a22'
    c.lineWidth = 1.8
    c.beginPath()
    c.arc(-r * 0.08, r * 0.18, r * 0.08, 0, Math.PI)
    c.arc(r * 0.08, r * 0.18, r * 0.08, 0, Math.PI)
    c.stroke()
  }

  // 황금 광택
  if (type.rare) {
    c.fillStyle = 'rgba(255,255,255,.8)'
    c.beginPath()
    c.ellipse(-r * 0.4, -r * 0.45, r * 0.18, r * 0.1, -0.6, 0, TAU)
    c.fill()
  }
}
