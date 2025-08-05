// 임시 멤버 추가 스크립트
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// API 요청 함수
async function makeRequest(url, method, data = null) {
  const fetch = (await import('node-fetch')).default;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(url, options);
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('API 요청 오류:', error);
    return null;
  }
}

async function addTempMembers() {
  console.log('🚀 임시 멤버 추가 작업을 시작합니다...\n');
  
  // 1. 연혁에 이승찬 합류 이벤트 추가
  console.log('📅 연혁에 이승찬 합류 이벤트 추가 중...');
  const historyEvent = {
    type: 'event',
    eventData: {
      title: '이승찬 합류 (정진규 대체)',
      description: '정진규 군 입대로 인해 이승찬이 임시 멤버로 합류했습니다.',
      date: '2025-07-21T00:00:00+09:00',
      type: 'member',
      icon: '🌟',
      color: 'secondary',
      importance: 3,
      isPublic: true
    }
  };
  
  const historyResult = await makeRequest('http://localhost:3000/api/site-history', 'POST', historyEvent);
  if (historyResult && historyResult.success) {
    console.log('✅ 연혁 이벤트 추가 완료');
  } else {
    console.log('❌ 연혁 이벤트 추가 실패');
  }
  
  // 2. 윤희열 합류 예정 이벤트 추가
  console.log('📅 연혁에 윤희열 합류 예정 이벤트 추가 중...');
  const futureEvent = {
    type: 'event',
    eventData: {
      title: '윤희열 합류 예정',
      description: '2025년 9월부터 윤희열이 임시 멤버로 합류할 예정입니다.',
      date: '2025-09-01T00:00:00+09:00',
      type: 'member',
      icon: '🔮',
      color: 'accent',
      importance: 3,
      isPublic: true
    }
  };
  
  const futureResult = await makeRequest('http://localhost:3000/api/site-history', 'POST', futureEvent);
  if (futureResult && futureResult.success) {
    console.log('✅ 미래 이벤트 추가 완료');
  } else {
    console.log('❌ 미래 이벤트 추가 실패');
  }
  
  console.log('\n🎉 임시 멤버 추가 작업이 완료되었습니다!');
  console.log('\n📋 다음 작업들을 수동으로 완료해야 합니다:');
  console.log('1. public/images/ 폴더에 seungchan.jpg, heeyeol.jpg 이미지 추가');
  console.log('2. public/videos/ 폴더에 intro-seungchan.mp4, intro-heeyeol.mp4 영상 추가');
  console.log('3. MongoDB에 새로운 사용자 계정 생성');
  
  rl.close();
}

// 스크립트 실행
addTempMembers().catch(console.error);