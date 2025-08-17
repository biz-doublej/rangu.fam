const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function deploySeungchan() {
  console.log('🚀 이승찬 프로필 배포 작업을 시작합니다...\n');
  
  console.log('📋 다음 작업들이 순서대로 실행됩니다:');
  console.log('1. 사용자 로그인 정보 업데이트');
  console.log('2. 이승찬 프로필 생성');
  console.log('3. 연혁 이벤트 추가\n');
  
  console.log('💡 실행 전 확인사항:');
  console.log('- MongoDB 서버가 실행 중인지 확인');
  console.log('- .env 파일에 MONGODB_URI가 설정되어 있는지 확인');
  console.log('- bcryptjs 패키지가 설치되어 있는지 확인 (npm install bcryptjs)\n');
  
  // 사용자 확인
  const shouldContinue = await new Promise((resolve) => {
    rl.question('계속 진행하시겠습니까? (y/N): ', (answer) => {
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
  
  if (!shouldContinue) {
    console.log('❌ 작업이 취소되었습니다.');
    rl.close();
    return;
  }
  
  console.log('\n🔧 작업을 시작합니다...\n');
  
  try {
    // 1. 사용자 로그인 정보 업데이트
    console.log('1️⃣ 사용자 로그인 정보 업데이트 중...');
    const updateUsers = require('./update-user-credentials');
    await updateUsers.updateUserCredentials();
    console.log('✅ 사용자 정보 업데이트 완료\n');
    
    // 2. 이승찬 프로필 생성
    console.log('2️⃣ 이승찬 프로필 생성 중...');
    const seedProfile = require('./seed-seungchan-profile');
    await seedProfile.seedSeungchanProfile();
    console.log('✅ 이승찬 프로필 생성 완료\n');
    
    console.log('🎉 모든 작업이 완료되었습니다!\n');
    
    console.log('📋 배포 결과:');
    console.log('✅ 이승찬 개인 페이지 (/members/seungchan)');
    console.log('✅ 군입대/전역 디데이 위젯');
    console.log('✅ 마술사 테마 디자인');
    console.log('✅ 사클 API 연동 (프로젝트 진행 상황)');
    console.log('✅ 새로운 로그인 정보\n');
    
    console.log('🔐 업데이트된 로그인 정보:');
    console.log('강한울: kanghu05 / rkdgksdnf05');
    console.log('이승찬: mushbit / -5MNa4skn*ntPQQ');
    console.log('정재원: jung051004 / wodnjsjung050727!');
    console.log('정민석: qudtls / qudtlstoRl\n');
    
    console.log('🌐 접속 방법:');
    console.log('1. 웹사이트에 접속');
    console.log('2. 새로운 아이디/비밀번호로 로그인');
    console.log('3. /members/seungchan 페이지에서 이승찬 프로필 확인');
    
  } catch (error) {
    console.error('❌ 배포 중 오류가 발생했습니다:', error);
  }
  
  rl.close();
}

// 스크립트 실행
deploySeungchan().catch(console.error);
