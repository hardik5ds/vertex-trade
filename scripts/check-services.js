import mongoose from 'mongoose'
import nodemailer from 'nodemailer'
import connectDB from '../src/lib/db.js'
import { fetchSingleQuote } from '../src/lib/yahooFinance.js'
const results = {}
try {
  const db = await connectDB()
  const info = await db.connection.db.admin().command({ hello: 1 })
  results.database = {
    connected: true,
    transactionsSupported: !!info.setName || info.msg === 'isdbgrid',
    users: await db.connection.db.collection('users').countDocuments(),
  }
} catch (error) {
  results.database = { connected: false, error: error.name }
}
try {
  const quote = await fetchSingleQuote('AAPL')
  results.market = { available: true, candles: quote.candles.length, quoteAsOf: quote.quoteAsOf }
} catch (error) {
  results.market = { available: false, error: error.message }
}
try {
  const transport = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    requireTLS: true,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: { user: process.env.BREVO_SMTP_USER, pass: process.env.BREVO_SMTP_PASSWORD },
  })
  await transport.verify()
  results.email = { authenticated: true, sentEmails: 0 }
} catch (error) {
  results.email = { authenticated: false, error: error.code || error.name }
}
console.log(JSON.stringify(results, null, 2))
await mongoose.disconnect()
