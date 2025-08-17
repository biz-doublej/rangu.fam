const fs = require('fs');
const path = require('path');

// API 라우트 디렉토리
const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');

function fixDynamicPlacement(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 잘못 삽입된 dynamic export 찾기
    const lines = content.split('\n');
    let fixedLines = [];
    let dynamicExports = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 잘못된 위치의 dynamic export 찾기
      if (line.trim() === "export const dynamic = 'force-dynamic'") {
        // 이전 라인이 함수 선언이면 잘못 삽입된 것
        if (i > 0 && (lines[i-1].includes('export async function') || lines[i-1].includes('export function'))) {
          dynamicExports.push(line);
          continue; // 이 라인은 제거
        }
      }
      
      fixedLines.push(line);
    }
    
    // dynamic export가 발견되었다면 올바른 위치에 삽입
    if (dynamicExports.length > 0) {
      const newLines = [];
      let insertIndex = 0;
      
      // import 문 다음 적절한 위치 찾기
      for (let i = 0; i < fixedLines.length; i++) {
        if (fixedLines[i].startsWith('import ')) {
          insertIndex = i + 1;
        } else if (fixedLines[i].trim() === '') {
          if (insertIndex > 0) {
            insertIndex = i + 1;
          }
        } else {
          break;
        }
      }
      
      // 새로운 배열 구성
      for (let i = 0; i < fixedLines.length; i++) {
        newLines.push(fixedLines[i]);
        
        if (i === insertIndex - 1) {
          newLines.push('');
          newLines.push("export const dynamic = 'force-dynamic'");
        }
      }
      
      fs.writeFileSync(filePath, newLines.join('\n'));
      console.log(`✅ ${filePath}: dynamic 위치 수정`);
      return true;
    }
    
    return false;
    
  } catch (error) {
    console.error(`❌ ${filePath}: 오류 -`, error.message);
    return false;
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  let fixedCount = 0;
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      fixedCount += processDirectory(fullPath);
    } else if (file === 'route.ts') {
      if (fixDynamicPlacement(fullPath)) {
        fixedCount++;
      }
    }
  }
  
  return fixedCount;
}

console.log('잘못된 dynamic export 위치 수정 중...');
const fixed = processDirectory(apiDir);
console.log(`\n완료! ${fixed}개 파일 수정됨`);
