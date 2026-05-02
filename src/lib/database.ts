import mongoose from 'mongoose'
import { getRequiredEnv } from '@/lib/env'

declare global {
  var mongoose: any // This must be a `var` and not a `let / const`
}

// App uses PostgreSQL only.
// Runtime connection goes through a PostgreSQL-backed bridge endpoint (FerretDB).
const POSTGRES_BRIDGE_URI = getRequiredEnv('POSTGRES_BRIDGE_URI')

let cached = global.mongoose

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null }
}

async function connectDatabase() {
  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }

    cached.promise = mongoose.connect(POSTGRES_BRIDGE_URI, opts).then((mongoose) => {
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

export default connectDatabase
export const connectToDatabase = connectDatabase
