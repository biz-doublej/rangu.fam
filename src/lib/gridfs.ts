import mongoose from 'mongoose'

let mediaBucket: mongoose.mongo.GridFSBucket | null = null

export function resetMediaBucket() {
  mediaBucket = null
}

export function getMediaBucket(): mongoose.mongo.GridFSBucket {
  const connection = mongoose.connection

  if (!connection || connection.readyState !== 1 || !connection.db) {
    throw new Error('PostgreSQL bridge connection is not ready')
  }

  if (!mediaBucket) {
    mediaBucket = new mongoose.mongo.GridFSBucket(connection.db as any, {
      bucketName: 'mediaAssets',
    })
  }

  return mediaBucket
}
