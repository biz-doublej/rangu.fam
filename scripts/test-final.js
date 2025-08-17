// Node.js 18+의 내장 fetch 사용
const fetch = globalThis.fetch;

const BASE_URL = 'https://rangu-8av4pid6l-gabrieljung0727s-projects.vercel.app';

async function testFinal() {
  console.log('최종 API 테스트...\n');

  console.log('1. Debug7 API (bcryptjs 테스트)...');
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

  console.log('\n2. 회원가입 API 테스트...');
  try {
    const registerResponse = await fetch(`${BASE_URL}/api/wiki/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'testuser123',
        email: 'test@example.com',
        password: 'testpassword123'
      })
    });
    console.log('상태:', registerResponse.status);
    const registerText = await registerResponse.text();
    console.log('응답:', registerText);
  } catch (error) {
    console.error('회원가입 API 오류:', error.message);
  }

  console.log('\n3. 로그인 API 테스트...');
  try {
    const loginResponse = await fetch(`${BASE_URL}/api/wiki/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'jung051004',
        password: 'wrongpassword'
      })
    });
    console.log('상태:', loginResponse.status);
    const loginText = await loginResponse.text();
    console.log('응답:', loginText);
  } catch (error) {
    console.error('로그인 API 오류:', error.message);
  }
}

testFinal();
