// Node.js 18+의 내장 fetch 사용
const fetch = globalThis.fetch;

const BASE_URL = 'https://rangu-8av4pid6l-gabrieljung0727s-projects.vercel.app';

async function testDebugOnly() {
  console.log('Debug API들만 테스트...\n');

  console.log('1. Debug5 API (bcrypt만 테스트)...');
  try {
    const debug5Response = await fetch(`${BASE_URL}/api/wiki/auth/debug5`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: 'debug5 with bcrypt only' })
    });
    console.log('상태:', debug5Response.status);
    const debug5Text = await debug5Response.text();
    console.log('응답:', debug5Text);
  } catch (error) {
    console.error('Debug5 POST 오류:', error.message);
  }

  console.log('\n2. Debug6 API (jwt만 테스트)...');
  try {
    const debug6Response = await fetch(`${BASE_URL}/api/wiki/auth/debug6`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: 'debug6 with jwt only' })
    });
    console.log('상태:', debug6Response.status);
    const debug6Text = await debug6Response.text();
    console.log('응답:', debug6Text);
  } catch (error) {
    console.error('Debug6 POST 오류:', error.message);
  }

  console.log('\n3. Debug7 API (bcryptjs 테스트)...');
  try {
    const debug7Response = await fetch(`${BASE_URL}/api/wiki/auth/debug7`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: 'debug7 with bcryptjs' })
    });
    console.log('상태:', debug7Response.status);
    const debug7Text = await debug7Response.text();
    console.log('응답:', debug7Text);
  } catch (error) {
    console.error('Debug7 POST 오류:', error.message);
  }
}

testDebugOnly();
