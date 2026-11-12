import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// base './' keeps the build working both on GitHub Pages sub-paths and when opened from any static host.
export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    environment: 'node',
  },
})
