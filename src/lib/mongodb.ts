import mongoose from 'mongoose'

declare global {
  var mongoose: any // This must be a `var` and not a `let / const`
}

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rangu-fam'

// MongoDB URI가 설정되지 않은 경우 경고 메시지 출력
if (!process.env.MONGODB_URI) {
  console.log('⚠️ MONGODB_URI 환경 변수가 설정되지 않았습니다. 기본값을 사용합니다:', MONGODB_URI)
}

// MongoDB Atlas Network Access 설정 완료 후 정상 연결 가능

let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn
  }
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose
    })
  }
  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

// 기본 export
export default dbConnect

// named export for compatibility
export const connectToDatabase = dbConnect 