import nodemailer from 'nodemailer'
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  )
export async function sendCode(email, code, purpose, createTransport = nodemailer.createTransport) {
  const local = process.env.NODE_ENV === 'development' && process.env.SMTP_HOST === '127.0.0.1'
  if (
    !local &&
    (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_PASSWORD || !process.env.EMAIL_FROM)
  )
    throw new Error('Email delivery is not configured')
  const transport = createTransport({
    host: local ? '127.0.0.1' : 'smtp-relay.brevo.com',
    port: local ? Number(process.env.SMTP_PORT) : 587,
    secure: false,
    requireTLS: !local,
    ...(local
      ? { ignoreTLS: true }
      : { auth: { user: process.env.BREVO_SMTP_USER, pass: process.env.BREVO_SMTP_PASSWORD } }),
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  })
  const title = purpose === 'SIGNUP' ? 'Verify your email' : 'Reset your password'
  try {
    const result = await transport.sendMail({
      from: process.env.EMAIL_FROM,
      to: email,
      subject: `${title} · Vertex Trade`,
      text: `Vertex Trade\n${title}\nYour code: ${code}\nExpires in 10 minutes. Never share this code. If you did not request it, ignore this email.`,
      html: `<div style="background:#09090b;color:#fafafa;padding:48px 24px;font-family:Arial,sans-serif"><div style="max-width:460px;margin:auto"><p style="font-size:21px;font-weight:600">∨ Vertex Trade</p><h1 style="font-size:30px;letter-spacing:-1px">${title}</h1><p style="color:#a1a1aa">Use this code to continue. It expires in 10 minutes.</p><div style="background:#18181b;border:1px solid #303036;border-radius:16px;padding:24px;font-size:36px;letter-spacing:10px;text-align:center">${escape(code)}</div><p style="color:#a1a1aa;font-size:13px;line-height:1.7">Never share this code. If you did not request it, you can ignore this email.</p></div></div>`,
    })
    if (!result.accepted?.some((address) => address.toLowerCase() === email.toLowerCase()))
      throw Object.assign(new Error('Recipient was not accepted by the mail provider'), {
        code: 'ERECIPIENT',
      })
    // No address, code, credentials, SMTP response text or message body is logged.
    console.info('[email]', JSON.stringify({ event: 'smtp_accepted', purpose }))
  } catch (error) {
    const codes = [
      'EAUTH',
      'ETIMEDOUT',
      'ECONNECTION',
      'ESOCKET',
      'EENVELOPE',
      'EMESSAGE',
      'ERECIPIENT',
    ]
    console.error(
      '[email]',
      JSON.stringify({
        event: 'smtp_failed',
        purpose,
        code: codes.includes(error.code) ? error.code : 'SMTP_ERROR',
        ...(Number.isInteger(error.responseCode) ? { responseCode: error.responseCode } : {}),
      }),
    )
    throw error
  } finally {
    transport.close()
  }
}
