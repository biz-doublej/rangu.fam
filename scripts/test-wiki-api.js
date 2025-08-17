// Node.js 18+의 내장 fetch 사용
const fetch = globalThis.fetch;

const BASE_URL = 'https://rangu-mtfuerefl-gabrieljung0727s-projects.vercel.app';

async function testAPI() {
  console.log('위키 API 테스트 시작...\n');

  // 1. 테스트 엔드포인트 확인
  try {
    console.log('1. 테스트 엔드포인트 GET 요청...');
    const testResponse = await fetch(`${BASE_URL}/api/wiki/auth/test`);
    console.log('상태:', testResponse.status);
    if (testResponse.ok) {
      const testData = await testResponse.text();
      console.log('응답:', testData);
    } else {
      console.log('오류 응답:', testResponse.statusText);
    }
  } catch (error) {
    console.error('테스트 GET 오류:', error.message);
  }

  console.log('\n2. 테스트 엔드포인트 POST 요청...');
  try {
    const testPostResponse = await fetch(`${BASE_URL}/api/wiki/auth/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: 'data' })
    });
    console.log('상태:', testPostResponse.status);
    if (testPostResponse.ok) {
      const testPostData = await testPostResponse.text();
      console.log('응답:', testPostData);
    } else {
      console.log('오류 응답:', testPostResponse.statusText);
    }
  } catch (error) {
    console.error('테스트 POST 오류:', error.message);
  }

  // 3. Debug API 테스트
  console.log('\n3. Debug API GET 테스트...');
  try {
    const debugGetResponse = await fetch(`${BASE_URL}/api/wiki/auth/debug`);
    console.log('상태:', debugGetResponse.status);
    const debugGetText = await debugGetResponse.text();
    console.log('응답:', debugGetText);
  } catch (error) {
    console.error('Debug GET 오류:', error.message);
  }

  console.log('\n4. Debug API POST 테스트...');
  try {
    const debugPostResponse = await fetch(`${BASE_URL}/api/wiki/auth/debug`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: 'debug data' })
    });
    console.log('상태:', debugPostResponse.status);
    const debugPostText = await debugPostResponse.text();
    console.log('응답:', debugPostText);
  } catch (error) {
    console.error('Debug POST 오류:', error.message);
  }

  console.log('\n4-2. Debug2 API (MongoDB 테스트)...');
  try {
    const debug2Response = await fetch(`${BASE_URL}/api/wiki/auth/debug2`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: 'debug2 with mongodb' })
    });
    console.log('상태:', debug2Response.status);
    const debug2Text = await debug2Response.text();
    console.log('응답:', debug2Text);
  } catch (error) {
    console.error('Debug2 POST 오류:', error.message);
  }

  console.log('\n4-3. Debug3 API (WikiUser 모델 테스트)...');
  try {
    const debug3Response = await fetch(`${BASE_URL}/api/wiki/auth/debug3`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: 'debug3 with wikiuser model' })
    });
    console.log('상태:', debug3Response.status);
    const debug3Text = await debug3Response.text();
    console.log('응답:', debug3Text);
  } catch (error) {
    console.error('Debug3 POST 오류:', error.message);
  }

  console.log('\n4-4. Debug4 API (bcrypt + jwt 테스트)...');
  try {
    const debug4Response = await fetch(`${BASE_URL}/api/wiki/auth/debug4`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ test: 'debug4 with bcrypt and jwt' })
    });
    console.log('상태:', debug4Response.status);
    const debug4Text = await debug4Response.text();
    console.log('응답:', debug4Text);
  } catch (error) {
    console.error('Debug4 POST 오류:', error.message);
  }

  // 5. 회원가입 API 테스트
  console.log('\n5. 회원가입 API 테스트...');
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
    console.log('응답 헤더:', Object.fromEntries(registerResponse.headers.entries()));
    const registerText = await registerResponse.text();
    console.log('응답 텍스트 길이:', registerText.length);
    console.log('응답 텍스트:', registerText);
    
    if (registerText) {
      try {
        const registerData = JSON.parse(registerText);
        console.log('파싱된 응답:', registerData);
      } catch (parseError) {
        console.log('JSON 파싱 실패:', parseError.message);
      }
    }
  } catch (error) {
    console.error('회원가입 API 오류:', error.message);
  }

  // 6. 로그인 API 테스트
  console.log('\n6. 로그인 API 테스트...');
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
    console.log('응답 헤더:', Object.fromEntries(loginResponse.headers.entries()));
    const loginText = await loginResponse.text();
    console.log('응답 텍스트 길이:', loginText.length);
    console.log('응답 텍스트:', loginText);
    
    if (loginText) {
      try {
        const loginData = JSON.parse(loginText);
        console.log('파싱된 응답:', loginData);
      } catch (parseError) {
        console.log('JSON 파싱 실패:', parseError.message);
      }
    }
  } catch (error) {
    console.error('로그인 API 오류:', error.message);
  }
}

testAPI();
