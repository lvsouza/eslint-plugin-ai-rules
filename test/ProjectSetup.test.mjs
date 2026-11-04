import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { test } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const distUrl = pathToFileURL(path.join(repoRoot, 'dist/index.js')).href
const packageJsonPath = path.join(repoRoot, 'package.json')

function runSetupRule(
  settings,
  files = ['Test.ts'],
  env = {},
  ruleEntry = 'warn',
) {
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
  rules: { 'ai-rules/project-setup': ${JSON.stringify(ruleEntry)} },
}
const messages = []
for (const filename of ${JSON.stringify(files)}) {
  messages.push(...linter.verify('', config, { filename }))
}
process.stdout.write(JSON.stringify(messages))
`

  return spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...env,
    },
  })
}

function messagesOf(result) {
  assert.equal(result.status, 0, result.stderr)

  return JSON.parse(result.stdout)
}

function setupMessages(result) {
  return messagesOf(result).filter(
    (message) => message.ruleId === 'ai-rules/project-setup',
  )
}

function assertWarning(result, severity = 1) {
  const messages = setupMessages(result)

  assert.equal(messages.length, 1)
  assert.equal(messages[0].severity, severity)
  assert.match(
    messages[0].message,
    /Project structure validation is not configured/,
  )
}

function assertNoWarning(result) {
  assert.equal(setupMessages(result).length, 0)
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

test('does not warn when relations are configured', () => {
  assertNoWarning(
    runSetupRule({
      'ai-rules': {
        project: {
          rootFolder: '.',
          structure: {},
          relations: {
            layers: {
              controller: 'src/http/controllers',
              repository: 'src/repositories',
            },
            rules: [
              {
                from: 'controller',
                deny: ['repository'],
              },
            ],
          },
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

test('can be silenced with AI_RULES_SILENT=1', () => {
  assertNoWarning(runSetupRule(null, ['Test.ts'], { AI_RULES_SILENT: '1' }))
})

test('can be disabled with off', () => {
  assertNoWarning(runSetupRule(null, ['Test.ts'], {}, 'off'))
})

test('can be reported as an error', () => {
  assertWarning(runSetupRule(null, ['Test.ts'], {}, 'error'), 2)
})

test('warns only once per process', () => {
  const result = runSetupRule(null, ['First.ts', 'Second.ts'])

  assert.equal(setupMessages(result).length, 1)
})
