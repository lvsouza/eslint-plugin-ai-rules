import { readFileSync } from 'node:fs'
import { defineConfig } from 'tsup'


const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8'),
) as { version: string }


export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  outDir: 'dist',
  external: ['eslint', 'typescript'],
  define: {
    __AI_RULES_VERSION__: JSON.stringify(packageJson.version),
  },
})
