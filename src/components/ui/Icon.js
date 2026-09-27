const paths = {
  market: 'M3 17 8 12 12 15 21 5 M15 5h6v6',
  predictions: 'M4 5h16v15H4z M8 2v6 M16 2v6 M4 11h16 M8 15h3',
  portfolio: 'M4 20V10h4v10 M10 20V4h4v16 M16 20v-8h4v8',
  wallet: 'M3 6h17v14H3z M3 6V4h15 M15 11h6v5h-6z',
  admin: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z M8 12l3 3 5-6',
  arrow: 'M4 12h16 M14 6l6 6-6 6',
  bell: 'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3Z M10 21h4',
  close: 'm6 6 12 12 M6 18 18 6',
  search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  logout: 'M9 3H4v18h5 M10 12h11 M17 8l4 4-4 4',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  check: 'm5 12 4 4L19 6',
  refresh: 'M20 7v5h-5 M4 17v-5h5 M6 6a8 8 0 0 1 14 6 M4 12a8 8 0 0 0 14 6',
  lock: 'M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4',
  clock: 'M12 8v5l3 2 M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
}
export default function Icon({ name, size = 20 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.market} />
    </svg>
  )
}
