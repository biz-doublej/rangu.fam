import React from 'react'

export default function App() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0b1220',
      color: '#e5e7eb',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'"
    }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>Rangu.fam</h1>
        <p style={{ opacity: 0.8 }}>CRA 프론트엔드 엔트리가 복원되었습니다.</p>
        <p style={{ opacity: 0.6, marginTop: 8 }}>메인 화면은 추후 라우팅에 맞춰 연결할 수 있어요.</p>
      </div>
    </div>
  )
}

