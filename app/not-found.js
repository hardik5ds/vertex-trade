import Link from 'next/link'
import Brand from '@/components/ui/Brand'
export default function NotFound() {
  return (
    <main className="legal">
      <Brand />
      <h1 style={{ marginTop: 60 }}>This page moved on.</h1>
      <p>We couldn’t find that page. Your workspace is still here.</p>
      <Link href="/dashboard" className="button">
        Return to workspace
      </Link>
    </main>
  )
}
