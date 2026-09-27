import Brand from '@/components/ui/Brand'
export const metadata = { title: 'Privacy' }
export default function Privacy() {
  return (
    <main className="legal">
      <Brand />
      <h1 style={{ marginTop: 48 }}>Privacy</h1>
      <p>
        Vertex Trade stores the name and email you provide, a password hash, verification records,
        session records, predictions, virtual wallet transactions, and notifications. These records
        support your account and the simulation.
      </p>
      <h2>Authentication</h2>
      <p>
        Session tokens are stored in HttpOnly cookies. Verification codes are stored as keyed hashes
        and expire after 10 minutes. Passwords are hashed with bcrypt. Codes and passwords are not
        included in application logs.
      </p>
      <h2>Service providers</h2>
      <p>
        MongoDB stores application records. Brevo delivers verification emails to your address.
        Yahoo Finance receives requests for market symbols. The hosting provider processes network
        requests. No payment processor receives card or bank details because payments are simulated.
      </p>
      <h2>Access and retention</h2>
      <p>
        Account records persist to maintain your prediction history and wallet audit trail. Expired
        sessions, verification records, and rate-limit records are automatically removed after
        expiry. The verified administrator can view account and transaction records for platform
        operations; passwords and verification hashes are not returned through admin APIs.
      </p>
      <h2>Contact</h2>
      <p>
        For account or data requests, contact{' '}
        <a className="link" href="mailto:singhalhardik044@gmail.com">
          singhalhardik044@gmail.com
        </a>
        .
      </p>
    </main>
  )
}
