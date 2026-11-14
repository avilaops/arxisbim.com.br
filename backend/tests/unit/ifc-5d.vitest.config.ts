import { defineConfig } from 'vitest/config';
// Run node build.mjs first: production workers resolve from dist even in isolated tests.
export default defineConfig({ test: { include: ['tests/unit/ifc-5d.spec.ts'] } });
