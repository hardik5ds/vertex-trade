'use client'
import { ResourceError } from '@/components/ui/Common'
export default function ErrorPage({ reset }) {
  return (
    <main className="legal">
      <h1>Something didn’t load.</h1>
      <ResourceError
        error={{ message: 'Your workspace could not be displayed. Try loading it again.' }}
        retry={reset}
      />
    </main>
  )
}
