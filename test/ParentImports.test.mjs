import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { after, test } from 'node:test'

import { Linter } from 'eslint'

import aiRules from '../dist/index.js'

const tempRoot = mkdtempSync(path.join(process.cwd(), '.tmp-parent-imports-'))

function write(relativePath, content) {
  const fullPath = path.join(tempRoot, relativePath)

  mkdirSync(path.dirname(fullPath), { recursive: true })
  writeFileSync(fullPath, content)
}

function verify(relativeFilename, code, overrides = []) {
  return new Linter().verify(
    code,
    [
      {
        files: ['**/*.{js,cjs,mjs,jsx,ts,tsx}'],
        languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
      },
      ...aiRules.configs.recommended,
      {
        rules: {
          'ai-rules/project-setup': 'off',
          'ai-rules/filename-pascal-case': 'off',
          'ai-rules/consistent-type-imports': 'off',
          'ai-rules/naming-convention': 'off',
          'ai-rules/no-unused-vars': 'off',
        },
      },
      ...overrides,
    ],
    { filename: path.join(tempRoot, relativeFilename) },
  )
}

function parentImportMessages(messages) {
  return messages.filter(
    (message) => message.ruleId === 'ai-rules/no-relative-parent-imports',
  )
}

after(() => {
  rmSync(tempRoot, { recursive: true, force: true })
})

test('reports relative imports from parent directories', () => {
  write('src/Parent.ts', 'export const value = 1\n')

  const messages = parentImportMessages(
    verify('src/child/Child.ts', "import { value } from '../Parent'\n"),
  )

  assert.equal(messages.length, 1)
})

test('accepts sibling relative imports', () => {
  write('src/child/Sibling.ts', 'export const value = 1\n')

  const messages = parentImportMessages(
    verify('src/child/Child.ts', "import { value } from './Sibling'\n"),
  )

  assert.equal(messages.length, 0)
})

test('accepts external imports', () => {
  const messages = parentImportMessages(
    verify('src/child/Child.ts', "import { readFile } from 'node:fs'\n"),
  )

  assert.equal(messages.length, 0)
})

test('can be disabled with a later flat config', () => {
  write('src/Parent.ts', 'export const value = 1\n')

  const messages = parentImportMessages(
    verify('src/child/Child.ts', "import { value } from '../Parent'\n", [
      { rules: { 'ai-rules/no-relative-parent-imports': 'off' } },
    ]),
  )

  assert.equal(messages.length, 0)
})
