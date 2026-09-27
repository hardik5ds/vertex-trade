'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useDispatch } from 'react-redux'
import { loginSuccess } from '@/redux/slices/authSlice'
import { request } from '@/lib/client'
import Brand from './Brand'
import Icon from './Icon'
import { Button, Message } from './Common'
export default function AuthScreen({ mode }) {
  const router = useRouter(),
    dispatch = useDispatch()
  const [step, setStep] = useState(0),
    [email, setEmail] = useState(''),
    [name, setName] = useState(''),
    [password, setPassword] = useState(''),
    [otp, setOtp] = useState(''),
    [registrationToken, setRegistrationToken] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('')
  const signup = mode === 'signup',
    reset = mode === 'reset'
  const title =
    !signup && !reset
      ? 'Welcome back.'
      : reset
        ? step === 0
          ? 'A fresh start.'
          : 'Set a new password.'
        : step === 0
          ? 'Your next chapter.'
          : step === 1
            ? 'Check your inbox.'
            : 'Make it yours.'
  const subtitle =
    !signup && !reset
      ? 'Sign in to your Vertex Trade workspace.'
      : step === 0
        ? signup
          ? 'Start practicing with ₹1,00,000 in virtual credits.'
          : 'We’ll email a code to verify it’s you.'
        : step === 1 && signup
          ? `Enter the six-digit code sent to ${email}.`
          : signup
            ? 'Your email is verified. Finish setting up your account.'
            : `Enter the code sent to ${email}, then choose your password.`
  async function sendCode() {
    await request('/api/auth/send-otp', {
      method: 'POST',
      body: { email, purpose: reset ? 'PASSWORD_RESET' : 'SIGNUP' },
    })
  }
  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (!signup && !reset) {
        const data = await request('/api/auth/login', { method: 'POST', body: { email, password } })
        dispatch(loginSuccess(data))
        router.replace('/dashboard')
      } else if (step === 0) {
        await sendCode()
        setStep(1)
      } else if (signup && step === 1) {
        const data = await request('/api/auth/verify-otp', { method: 'POST', body: { email, otp } })
        setRegistrationToken(data.registrationToken)
        setStep(2)
      } else if (signup) {
        const data = await request('/api/auth/complete-signup', {
          method: 'POST',
          body: { name, password, registrationToken },
        })
        dispatch(loginSuccess(data))
        router.replace('/dashboard')
      } else {
        await request('/api/auth/reset-password', {
          method: 'POST',
          body: { email, otp, newPassword: password },
        })
        setNotice('Password updated. You can now sign in.')
        setStep(2)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }
  async function resend() {
    setBusy(true)
    setError('')
    try {
      await sendCode()
      setNotice('A new code has been requested. Check your inbox.')
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }
  return (
    <main className="auth-page">
      <aside className="auth-story">
        <Brand />
        <div className="auth-story-content">
          <div className="eyebrow">A sharper market perspective</div>
          <h1>
            A little curiosity.
            <br />
            <span>A world of possibility.</span>
          </h1>
          <p>
            Follow the markets. Test your perspective.
            <br />
            Make your next prediction with confidence.
          </p>
          <div style={{ marginTop: 40, display: 'flex', gap: 30 }}>
            <div>
              <strong>₹1,00,000</strong>
              <small style={{ display: 'block', marginTop: 5 }}>Starting practice credits</small>
            </div>
            <div>
              <strong>Zero real stakes</strong>
              <small style={{ display: 'block', marginTop: 5 }}>A space to learn</small>
            </div>
          </div>
        </div>
        <div className="auth-story-foot">Vertex Trade · Virtual predictions, real perspective.</div>
      </aside>
      <section className="auth-form-side">
        <div className="auth-form">
          <div className="auth-mobile-brand">
            <Brand />
          </div>
          <div className="eyebrow">
            {signup ? 'Create an account' : reset ? 'Account recovery' : 'Your workspace awaits'}
          </div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
          <Message>{error}</Message>
          <Message success>{notice}</Message>
          {reset && step === 2 ? (
            <Link className="button" href="/login">
              Return to sign in <Icon name="arrow" size={16} />
            </Link>
          ) : (
            <form onSubmit={submit}>
              {((!signup && !reset) || step === 0) && (
                <div className="field">
                  <label htmlFor="email">Email address</label>
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    maxLength={254}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              )}
              {step === 1 && (
                <div className="field">
                  <label htmlFor="otp">Verification code</label>
                  <input
                    className="auth-code"
                    id="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    placeholder="000000"
                    required
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  />
                  <small className="field-help">
                    Expires in 10 minutes. Three attempts per code.
                  </small>
                </div>
              )}
              {signup && step === 2 && (
                <div className="field">
                  <label htmlFor="name">Full name</label>
                  <input
                    id="name"
                    autoComplete="name"
                    minLength={2}
                    maxLength={80}
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>
              )}
              {((!signup && !reset) || (signup && step === 2) || (reset && step === 1)) && (
                <div className="field">
                  <label htmlFor="password">{reset ? 'New password' : 'Password'}</label>
                  <input
                    id="password"
                    type="password"
                    autoComplete={signup || reset ? 'new-password' : 'current-password'}
                    minLength={signup || reset ? 10 : 1}
                    maxLength={72}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={signup || reset ? 'At least 10 characters' : 'Enter your password'}
                  />
                  {signup || reset ? (
                    <small className="field-help">
                      Use a unique password with at least 10 characters.
                    </small>
                  ) : (
                    <div style={{ textAlign: 'right', marginTop: 12 }}>
                      <Link className="link" href="/forgot-password">
                        Forgot password?
                      </Link>
                    </div>
                  )}
                </div>
              )}
              <Button type="submit" disabled={busy}>
                {busy ? (
                  <>
                    <span className="spinner" /> Please wait…
                  </>
                ) : !signup && !reset ? (
                  'Sign in'
                ) : step === 0 ? (
                  'Send verification code'
                ) : signup && step === 1 ? (
                  'Verify email'
                ) : signup ? (
                  'Create account'
                ) : (
                  'Update password'
                )}
                {!busy && <Icon name="arrow" size={16} />}
              </Button>
              {step === 1 && (
                <div className="auth-links">
                  <button className="table-action" type="button" disabled={busy} onClick={resend}>
                    Resend code
                  </button>
                  <span> · </span>
                  <button
                    className="table-action"
                    type="button"
                    onClick={() => {
                      setStep(0)
                      setError('')
                      setOtp('')
                    }}
                  >
                    Change email
                  </button>
                </div>
              )}
            </form>
          )}
          <div className="auth-links">
            {signup ? (
              <>
                Already have an account?{' '}
                <Link className="link" href="/login">
                  Sign in
                </Link>
              </>
            ) : reset ? (
              <Link className="link" href="/login">
                Back to sign in
              </Link>
            ) : (
              <>
                New here?{' '}
                <Link className="link" href="/signup">
                  Create an account
                </Link>
              </>
            )}
          </div>
          <p className="note" style={{ textAlign: 'center', marginTop: 30 }}>
            By continuing, you agree to the{' '}
            <Link className="link" href="/terms">
              Terms
            </Link>{' '}
            and{' '}
            <Link className="link" href="/privacy">
              Privacy Policy
            </Link>
            . All funds are simulated.
          </p>
        </div>
      </section>
    </main>
  )
}
