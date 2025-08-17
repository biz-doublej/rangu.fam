// Node.js 18+의 내장 fetch 사용
const fetch = globalThis.fetch;

const BASE_URL = 'https://rangu-8av4pid6l-gabrieljung0727s-projects.vercel.app';

async function test409Error() {
  console.log('409 오류 테스트...\n');

  console.log('1. 이미 존재하는 아이디로 회원가입 시도...');
  try {
    const registerResponse = await fetch(`${BASE_URL}/api/wiki/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'testuser123', // 이미 존재하는 아이디
        email: 'newemail@example.com',
        password: 'testpassword123'
      })
    });
    console.log('상태:', registerResponse.status);
    const registerText = await registerResponse.text();
    console.log('응답:', registerText);
  } catch (error) {
    console.error('회원가입 오류:', error.message);
  }

  console.log('\n2. 이미 존재하는 이메일로 회원가입 시도...');
  try {
    const registerResponse2 = await fetch(`${BASE_URL}/api/wiki/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'newuser456',
        email: 'test@example.com', // 이미 존재하는 이메일
        password: 'testpassword123'
      })
    });
    console.log('상태:', registerResponse2.status);
    const registerText2 = await registerResponse2.text();
    console.log('응답:', registerText2);
  } catch (error) {
    console.error('회원가입 오류:', error.message);
  }

  console.log('\n3. 정상적인 새 계정 회원가입...');
  try {
    const registerResponse3 = await fetch(`${BASE_URL}/api/wiki/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: 'newuser789',
        email: 'newuser789@example.com',
        password: 'testpassword123'
      })
    });
    console.log('상태:', registerResponse3.status);
    const registerText3 = await registerResponse3.text();
    console.log('응답:', registerText3);
  } catch (error) {
    console.error('회원가입 오류:', error.message);
  }
}

test409Error();
