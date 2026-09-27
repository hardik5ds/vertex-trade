import test from 'node:test'
import assert from 'node:assert/strict'
import { sendCode } from '../src/lib/emailService.js'

process.env.NODE_ENV = 'development'
process.env.SMTP_HOST = '127.0.0.1'
process.env.SMTP_PORT = '1025'
process.env.EMAIL_FROM = 'Vertex Trade <sender@example.test>'

test('email delivery requires SMTP acceptance of the intended recipient', async (t) => {
  const info = t.mock.method(console, 'info', () => {})
  let closed = false
  await sendCode('recipient@example.test', '123456', 'SIGNUP', () => ({
    sendMail: async (mail) => {
      assert.equal(mail.to, 'recipient@example.test')
      assert.match(mail.text, /123456/)
      return { accepted: [mail.to] }
    },
    close: () => {
      closed = true
    },
  }))
  assert.equal(closed, true)
  assert.match(JSON.stringify(info.mock.calls[0].arguments), /smtp_accepted/)
  assert.doesNotMatch(JSON.stringify(info.mock.calls[0].arguments), /123456|recipient@example/)
})
test('SMTP response without the recipient is a failure, never a sent-code success', async (t) => {
  t.mock.method(console, 'error', () => {})
  await assert.rejects(
    sendCode('recipient@example.test', '123456', 'SIGNUP', () => ({
      sendMail: async () => ({ accepted: [], rejected: ['recipient@example.test'] }),
      close: () => {},
    })),
    { code: 'ERECIPIENT' },
  )
})
test('SMTP failures log safe diagnostics and always close the connection', async (t) => {
  const log = t.mock.method(console, 'error', () => {})
  let closed = false
  await assert.rejects(
    sendCode('recipient@example.test', '123456', 'PASSWORD_RESET', () => ({
      sendMail: async () => {
        throw Object.assign(new Error('private provider message'), {
          code: 'EAUTH',
          responseCode: 535,
        })
      },
      close: () => {
        closed = true
      },
    })),
    { code: 'EAUTH' },
  )
  assert.equal(closed, true)
  const output = JSON.stringify(log.mock.calls[0].arguments)
  assert.match(output, /EAUTH/)
  assert.match(output, /535/)
  assert.doesNotMatch(output, /private provider|123456|recipient@example/)
})
