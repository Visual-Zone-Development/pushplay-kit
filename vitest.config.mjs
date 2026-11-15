import { defineConfig } from 'vitest/config'

// The build kit's tests (kit/). The skills' lint, the command line and the hook use node:test.
export default defineConfig({ test: { include: ['kit/src/**/*.test.mjs'], environment: 'node' } })
