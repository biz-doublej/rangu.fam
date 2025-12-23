import mongoose from 'mongoose'
import { GridFSBucket } from 'mongodb'

let mediaBucket: GridFSBucket | null = null

export function resetMediaBucket() {
  mediaBucket = null
}

export function getMediaBucket(): GridFSBucket {
  const connection = mongoose.connection

  if (!connection || connection.readyState !== 1 || !connection.db) {
    throw new Error('MongoDB connection is not ready')
  }

  if (!mediaBucket) {
    mediaBucket = new GridFSBucket(connection.db as any, {
      bucketName: 'mediaAssets',
    })
  }

  return mediaBucket
}
