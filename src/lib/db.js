import mongoose from 'mongoose'
const cache = (globalThis.vertexDB ||= { connection: null, promise: null })
export default async function connectDB() {
  if (cache.connection?.connection.readyState === 1) return cache.connection
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not configured')
  cache.promise ||= mongoose.connect(process.env.MONGODB_URI, {
    maxPoolSize: 10,
    minPoolSize: 0,
    bufferCommands: false,
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 20000,
  })
  try {
    cache.connection = await cache.promise
    return cache.connection
  } catch (error) {
    cache.promise = null
    cache.connection = null
    throw error
  }
}
export async function inTransaction(work) {
  await connectDB()
  const session = await mongoose.startSession()
  try {
    return await session.withTransaction(() => work(session), {
      readConcern: { level: 'snapshot' },
      writeConcern: { w: 'majority' },
      readPreference: 'primary',
    })
  } finally {
    await session.endSession()
  }
}
