import { defineConfig, globalIgnores } from 'eslint/config'
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

export default defineConfig([
  ...nextCoreWebVitals,
  {
    rules: {
      // The flagged effects are deliberate patterns this app relies on:
      // SSR-safe localStorage/URL hydration after mount, loading/error flags
      // at the top of fetch effects, and URL-param -> active-tab sync.
      // Surfaced as warnings rather than refactored wholesale.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
])
