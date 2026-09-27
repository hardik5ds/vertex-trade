// Disposable database and local email inbox for actual browser-driven signup.
// This harness never loads .env.local and never connects to the user's database.
import { MongoMemoryReplSet } from 'mongodb-memory-server'
import { spawn } from 'node:child_process'
import { createServer as netServer } from 'node:net'
import { createServer as httpServer } from 'node:http'
import path from 'node:path'
import mongoose from 'mongoose'
import { randomBytes } from 'node:crypto'
import connectDB from '../src/lib/db.js'
import { migrate } from './migrate.js'
import { register } from '../src/lib/server/authService.js'
import { signRegistration } from '../src/lib/server/auth.js'
import Bid from '../src/lib/models/Bid.js'
import { finishPrediction } from '../src/lib/server/ledger.js'
const inbox = new Map()
const smtp = netServer((socket) => {
  socket.setEncoding('utf8')
  socket.write('220 localhost ESMTP\r\n')
  let buffer = '',
    data = false,
    message = '',
    recipient = ''
  socket.on('data', (chunk) => {
    buffer += chunk
    let end
    while ((end = buffer.indexOf('\r\n')) >= 0) {
      const line = buffer.slice(0, end)
      buffer = buffer.slice(end + 2)
      if (data) {
        if (line === '.') {
          data = false
          const code =
            message.match(/Your code: (\d{6})/)?.[1] || message.match(/>(\d{6})<\/div>/)?.[1]
          if (code) inbox.set(recipient, code)
          socket.write('250 queued\r\n')
        } else message += line + '\n'
        continue
      }
      if (/^EHLO|^HELO/.test(line)) socket.write('250-localhost\r\n250 SIZE 1000000\r\n')
      else if (/^RCPT TO:/i.test(line)) {
        recipient = line.match(/<([^>]+)>/)?.[1]
        socket.write('250 OK\r\n')
      } else if (line === 'DATA') {
        data = true
        message = ''
        socket.write('354 End with dot\r\n')
      } else if (line === 'QUIT') {
        socket.end('221 Bye\r\n')
      } else socket.write('250 OK\r\n')
    }
  })
})
await new Promise((resolve) => smtp.listen(0, '127.0.0.1', resolve))
const mongo = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
const env = {
  ...process.env,
  MONGODB_URI: mongo.getUri('vertex_e2e'),
  JWT_SECRET: randomBytes(48).toString('hex'),
  CRON_SECRET: randomBytes(32).toString('hex'),
  NEXT_PUBLIC_APP_URL: 'http://localhost:3100',
  ADMIN_EMAIL: 'admin@example.test',
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: String(smtp.address().port),
  EMAIL_FROM: 'Vertex Trade <test@example.test>',
  BREVO_SMTP_USER: '',
  BREVO_SMTP_PASSWORD: '',
  NODE_ENV: 'development',
  NEXT_TELEMETRY_DISABLED: '1',
  NODE_OPTIONS: `--import=${path.resolve('tests/fixtures/market-fetch.mjs')}`,
}
Object.assign(process.env, env)
await connectDB()
await migrate()
await register({
  name: 'Test Admin',
  password: 'admin-test-password',
  registrationToken: signRegistration('admin@example.test'),
})
const control = httpServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:3101')
  if (url.pathname === '/inbox') {
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({ code: inbox.get(url.searchParams.get('email')) }))
    return
  }
  if (url.pathname === '/settle' && req.method === 'POST') {
    try {
      const bid = await Bid.findOne({ stockSymbol: 'AAPL', status: 'ACTIVE' }).sort({
        placedAt: -1,
      })
      if (bid) {
        await Bid.updateOne({ _id: bid._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } })
        await finishPrediction(bid._id, { quote: { currentPrice: 100, quoteAsOf: new Date() } })
      }
      res.end('ok')
    } catch {
      res.statusCode = 500
      res.end('failed')
    }
    return
  }
  res.statusCode = 404
  res.end()
})
await new Promise((resolve) => control.listen(3101, '127.0.0.1', resolve))
const child = spawn(
  process.execPath,
  ['node_modules/next/dist/bin/next', 'dev', '-p', '3100', '-H', '127.0.0.1'],
  { env, stdio: 'inherit' },
)
let closing = false
async function close() {
  if (closing) return
  closing = true
  child.kill('SIGTERM')
  smtp.close()
  control.close()
  await mongoose.disconnect()
  await mongo.stop()
  process.exit(0)
}
process.on('SIGTERM', close)
process.on('SIGINT', close)
child.on('exit', close)
