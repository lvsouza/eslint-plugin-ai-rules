import assert from 'node:assert/strict'
import { test } from 'node:test'

import { importX } from 'eslint-plugin-import-x'
import stylistic from '@stylistic/eslint-plugin'
import tseslint from 'typescript-eslint'
import boundaries from 'eslint-plugin-boundaries'

import aiRules from '../dist/index.js'

const ownRuleNames = new Set([
  'app-page-scope',
  'filename-pascal-case',
  'no-multiline-imports',
  'project-setup',
  'project-structure',
  'sort-imports',
])

const sources = [
  { name: 'import-x', rules: importX.rules },
  { name: 'stylistic', rules: stylistic.rules },
  {
    name: 'typescript-eslint',
    rules: tseslint.plugin.rules,
  },
  { name: 'boundaries', rules: boundaries.rules },
]

function expectedAliases() {
  const counts = new Map()

  for (const source of sources) {
    for (const ruleName of Object.keys(source.rules)) {
      counts.set(ruleName, (counts.get(ruleName) ?? 0) + 1)
    }
  }

  const aliases = new Map()

  for (const source of sources) {
    for (const [ruleName, rule] of Object.entries(source.rules)) {
      const needsPrefix =
        counts.get(ruleName) > 1 || ownRuleNames.has(ruleName)
      const alias = needsPrefix ? `${source.name}-${ruleName}` : ruleName

      aliases.set(alias, rule)
    }
  }

  return aliases
}

test('every bundled rule is exposed through ai-rules', () => {
  const aliases = expectedAliases()

  for (const [alias, rule] of aliases) {
    assert.equal(aiRules.rules[alias], rule, alias)
  }

  assert.equal(
    Object.keys(aiRules.rules).length,
    ownRuleNames.size + aliases.size,
  )
})

test('colliding upstream rule names are disambiguated by source', () => {
  assert.equal(aiRules.rules['no-namespace'], undefined)
  assert.equal(aiRules.rules['no-deprecated'], undefined)
  assert.equal(
    aiRules.rules['import-x-no-namespace'],
    importX.rules['no-namespace'],
  )
  assert.equal(
    aiRules.rules['typescript-eslint-no-namespace'],
    tseslint.plugin.rules['no-namespace'],
  )
  assert.equal(
    aiRules.rules['import-x-no-deprecated'],
    importX.rules['no-deprecated'],
  )
  assert.equal(
    aiRules.rules['typescript-eslint-no-deprecated'],
    tseslint.plugin.rules['no-deprecated'],
  )
})

test('recommended and projects expose only ai-rules rules and plugins', () => {
  assert.deepEqual(Object.keys(aiRules.configs.recommended[0].plugins), [
    'ai-rules',
  ])

  for (const ruleId of Object.keys(aiRules.configs.recommended[0].rules)) {
    assert.match(ruleId, /^(?:ai-rules\/|max-len$|no-debugger$|no-console$)/)
  }

  const [config] = aiRules.configs.projects([
    {
      rootFolder: '.',
      preset: 'other',
      relations: {
        layers: {
          controller: 'src/http/controllers',
          repository: 'src/repositories',
        },
        rules: [{ from: 'controller', deny: ['repository'] }],
      },
    },
  ])

  assert.deepEqual(Object.keys(config.plugins), ['ai-rules'])
  assert.equal(config.rules['ai-rules/dependencies'][0], 'error')
  assert.equal(config.rules['boundaries/dependencies'], undefined)
})
