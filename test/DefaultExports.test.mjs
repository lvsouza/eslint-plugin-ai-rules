import assert from 'node:assert/strict'
import { test } from 'node:test'

import { Linter } from 'eslint'

import aiRules from '../dist/index.js'

const files = ['**/*.{js,cjs,mjs,jsx,ts,tsx}']
const languageOptions = { ecmaVersion: 2022, sourceType: 'module' }

function verify(code, overrides = []) {
  return new Linter().verify(
    code,
    [
      { files, languageOptions },
      ...aiRules.configs.recommended,
      {
        rules: {
          'ai-rules/project-setup': 'off',
          'ai-rules/consistent-type-imports': 'off',
          'ai-rules/naming-convention': 'off',
        },
      },
      ...overrides,
    ],
    { filename: 'test.ts' },
  )
}

function defaultExportMessages(messages) {
  return messages.filter(
    (message) => message.ruleId === 'ai-rules/no-default-export',
  )
}

test('accepts named exports', () => {
  const messages = verify('export const value = 1\n')

  assert.equal(defaultExportMessages(messages).length, 0)
})

test('reports export default declarations', () => {
  const messages = defaultExportMessages(
    verify('export default function value() {}\n'),
  )

  assert.equal(messages.length, 1)
  assert.equal(messages[0].messageId, 'preferNamed')
})

test('reports values aliased as default', () => {
  const messages = defaultExportMessages(
    verify('const value = 1\nexport { value as default }\n'),
  )

  assert.equal(messages.length, 1)
  assert.equal(messages[0].messageId, 'noAliasDefault')
})

test('can be disabled with a later flat config', () => {
  const messages = verify('export default 1\n', [
    { rules: { 'ai-rules/no-default-export': 'off' } },
  ])

  assert.equal(defaultExportMessages(messages).length, 0)
})
