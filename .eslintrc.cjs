module.exports = {
  extends: ['next/core-web-vitals'],
  rules: { 'react/no-unescaped-entities': 'off', '@next/next/no-html-link-for-pages': 'error' },
  ignorePatterns: ['.next/', 'node_modules/', 'playwright-report/', 'test-results/'],
}
