import Link from 'next/link'
export function VertexIcon({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M3 6h6l7 18 7-18h6L18.5 29h-5L3 6Z" fill="currentColor" />
      <path d="m19 6 3 7 3-7h-6Z" fill="#4795ff" />
    </svg>
  )
}
export default function Brand() {
  return (
    <Link href="/" className="brand" aria-label="Vertex Trade home">
      <VertexIcon />
      <span>
        Vertex<span className="brand-light"> Trade</span>
      </span>
    </Link>
  )
}
