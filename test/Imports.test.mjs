import assert from 'node:assert/strict'
import { test } from 'node:test'

import { Linter } from 'eslint'

import aiRules, { getSortedContent } from '../dist/index.js'

const languageOptions = { ecmaVersion: 2022, sourceType: 'module' }
const files = ['**/*.{js,cjs,mjs,ts,tsx}']

function verify(code, rules) {
  return new Linter().verify(
    code,
    {
      files,
      plugins: { 'ai-rules': aiRules },
      languageOptions,
      rules,
    },
    { filename: 'test.ts' },
  )
}

function verifyAndFix(code, rules) {
  return new Linter().verifyAndFix(
    code,
    {
      files,
      plugins: { 'ai-rules': aiRules },
      languageOptions,
      rules,
    },
    { filename: 'test.ts' },
  )
}

test('no-multiline-imports collapses imports to one line', () => {
  const code = "import {\n  b,\n  a\n} from 'lodash'\n"
  const result = verifyAndFix(code, {
    'ai-rules/no-multiline-imports': 'error',
  })
  assert.equal(result.output, "import { b, a } from 'lodash'\n")
  assert.equal(result.messages.length, 0)
})

test('no-multiline-imports accepts single-line imports', () => {
  const messages = verify("import { b, a } from 'lodash'\n", {
    'ai-rules/no-multiline-imports': 'error',
  })
  assert.equal(messages.length, 0)
})

test('sort-imports orders react, externals and internals', () => {
  const code = [
    "import { local } from './local'",
    "import { a } from 'lodash'",
    "import React from 'react'",
    '',
  ].join('\n')
  const result = verifyAndFix(code, { 'ai-rules/sort-imports': 'error' })
  const output = result.output
  assert.ok(output.indexOf('react') < output.indexOf('lodash'), output)
  assert.ok(output.indexOf('lodash') < output.indexOf('./local'), output)
  assert.match(output, /from 'lodash'\n\nimport \{ local \}/)
})

test('getSortedContent returns null when there are no imports', () => {
  assert.equal(getSortedContent('const a = 1\n'), null)
})
