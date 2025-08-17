const fs = require('fs');
const path = require('path');

// API 라우트 디렉토리
const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');

// dynamic export를 추가할 패턴
const dynamicExport = `export const dynamic = 'force-dynamic'\n\n`;

function addDynamicToFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 이미 dynamic export가 있는지 확인
    if (content.includes("export const dynamic = 'force-dynamic'")) {
      console.log(`✓ ${filePath}: 이미 dynamic 설정 있음`);
      return false;
    }
    
    // import 문 다음에 dynamic export 추가
    const lines = content.split('\n');
    let insertIndex = 0;
    
    // 마지막 import 문 찾기
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('import ') || lines[i].startsWith('export ')) {
        insertIndex = i + 1;
      } else if (lines[i].trim() === '') {
        continue;
      } else {
        break;
      }
    }
    
    // dynamic export 삽입
    lines.splice(insertIndex, 0, dynamicExport.trim());
    
    fs.writeFileSync(filePath, lines.join('\n'));
    console.log(`✅ ${filePath}: dynamic 설정 추가`);
    return true;
    
  } catch (error) {
    console.error(`❌ ${filePath}: 오류 -`, error.message);
    return false;
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  let processedCount = 0;
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processedCount += processDirectory(fullPath);
    } else if (file === 'route.ts') {
      if (addDynamicToFile(fullPath)) {
        processedCount++;
      }
    }
  }
  
  return processedCount;
}

console.log('API 라우트에 dynamic 설정 추가 중...');
const processed = processDirectory(apiDir);
console.log(`\n완료! ${processed}개 파일 처리됨`);
