import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const distUrl = pathToFileURL(path.join(repoRoot, 'dist/index.js')).href
const packageJsonPath = path.join(repoRoot, 'package.json')

function runSetupRule(settings, files = ['Test.ts']) {
  const script = `
import { createRequire } from 'node:module'
const require = createRequire(${JSON.stringify(packageJsonPath)})
const { Linter } = require('eslint')
const aiRules = (await import(${JSON.stringify(distUrl)})).default
const settings = ${JSON.stringify(settings)}
const linter = new Linter()
const config = {
  files: ['**/*.ts'],
  plugins: { 'ai-rules': aiRules },
  ...(settings ? { settings } : {}),
  rules: { 'ai-rules/project-setup': 'warn' },
}
for (const filename of ${JSON.stringify(files)}) {
  linter.verify('', config, { filename })
}
`

  return spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
  })
}

function assertWarning(result) {
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stderr, /Project structure validation is not configured/)
}

function assertNoWarning(result) {
  assert.equal(result.status, 0, result.stderr)
  assert.doesNotMatch(
    result.stderr,
    /Project structure validation is not configured/,
  )
}

test('warns when project setup is missing', () => {
  assertWarning(runSetupRule(null))
})

test('does not warn for the other preset', () => {
  assertNoWarning(
    runSetupRule({
      'ai-rules': {
        project: {
          rootFolder: '.',
          preset: 'other',
          structure: {},
        },
      },
    }),
  )
})

test('does not warn for frontend and backend presets', () => {
  assertNoWarning(
    runSetupRule({
      'ai-rules': {
        project: {
          rootFolder: '.',
          preset: 'frontend',
          structure: {},
        },
      },
    }),
  )
  assertNoWarning(
    runSetupRule({
      'ai-rules': {
        project: {
          rootFolder: '.',
          preset: 'backend',
          structure: {},
        },
      },
    }),
  )
})

test('does not warn for a custom structure', () => {
  assertNoWarning(
    runSetupRule({
      'ai-rules': {
        project: {
          rootFolder: '.',
          structure: {
            folders: {
              src: {
                files: ['index.ts'],
              },
            },
          },
        },
      },
    }),
  )
})

test('warns when only rootFolder is provided', () => {
  assertWarning(
    runSetupRule({
      'ai-rules': {
        project: {
          rootFolder: '.',
          structure: {},
        },
      },
    }),
  )
})

test('warns only once per process', () => {
  const result = runSetupRule(null, ['First.ts', 'Second.ts'])

  assert.equal(result.status, 0, result.stderr)
  assert.equal(
    result.stderr.match(/Project structure validation is not configured/g)?.length,
    1,
  )
})
