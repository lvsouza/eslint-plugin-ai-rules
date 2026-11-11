import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'

import aiRules, {
  plugin,
  presets,
  projectSetup,
  projectStructure,
  projects,
  recommended,
} from '../dist/index.js'

const require = createRequire(import.meta.url)
const cjs = require('../dist/index.cjs')

test('ESM exports are wired correctly', () => {
  assert.equal(aiRules.configs.projects, projects)
  assert.equal(aiRules.configs.recommended, recommended)
  assert.equal(aiRules.rules['project-setup'], projectSetup)
  assert.equal(aiRules.rules['project-structure'], projectStructure)
  assert.equal(aiRules.meta.name, 'eslint-plugin-ai-rules')
  assert.equal(plugin.rules['project-setup'], projectSetup)
  assert.equal(plugin.rules['project-structure'], projectStructure)
  assert.equal(recommended[0].rules['ai-rules/project-setup'], 'warn')
  assert.equal(recommended[0].rules['ai-rules/no-default-export'], 'error')
  assert.equal(
    recommended[0].rules['ai-rules/no-relative-parent-imports'],
    'error',
  )
  assert.deepEqual(Object.keys(recommended[0].plugins), ['ai-rules'])
  assert.ok(aiRules.rules['no-duplicates'])
  assert.ok(aiRules.rules['semi'])
  assert.ok(aiRules.rules['dependencies'])
  assert.deepEqual(Object.keys(presets), ['frontend', 'nextjs', 'backend', 'other'])
})

test('rule names are stable and kebab-cased', () => {
  const ownRuleNames = [
    'filename-pascal-case',
    'no-multiline-imports',
    'project-setup',
    'project-structure',
    'sort-imports',
  ]

  for (const ruleName of ownRuleNames) {
    assert.ok(aiRules.rules[ruleName], ruleName)
  }

  for (const ruleName of Object.keys(aiRules.rules)) {
    assert.match(ruleName, /^[a-z]+(?:-[a-z]+)*$/)
  }

  const recommendedRuleNames = Object.keys(recommended[0].rules)
    .filter((ruleId) => ruleId.startsWith('ai-rules/'))
    .map((ruleId) => ruleId.slice('ai-rules/'.length))
    .sort()

  assert.deepEqual(recommendedRuleNames, [
    'consistent-type-imports',
    'filename-pascal-case',
    'naming-convention',
    'no-default-export',
    'no-duplicates',
    'no-multiline-imports',
    'no-relative-parent-imports',
    'no-unused-vars',
    'project-setup',
    'semi',
    'sort-imports',
  ])
})

test('CJS exports are wired correctly', () => {
  assert.equal(typeof cjs.default.configs.projects, 'function')
  assert.equal(typeof cjs.projects, 'function')
  assert.equal(cjs.default.rules['project-setup'], cjs.projectSetup)
  assert.equal(cjs.default.rules['project-structure'], cjs.projectStructure)
  assert.deepEqual(Object.keys(cjs.presets), ['frontend', 'nextjs', 'backend', 'other'])
})

test('build artifacts and package metadata exist', () => {
  const packageJson = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  )

  assert.equal(aiRules.meta.version, packageJson.version)
  assert.equal(packageJson.main, './dist/index.cjs')
  assert.equal(packageJson.module, './dist/index.js')
  assert.equal(packageJson.types, './dist/index.d.ts')
  assert.deepEqual(packageJson.files, ['dist', 'THIRD_PARTY_NOTICES.md'])
  assert.deepEqual(packageJson.exports['.'], {
    import: {
      types: './dist/index.d.ts',
      default: './dist/index.js',
    },
    require: {
      types: './dist/index.d.cts',
      default: './dist/index.cjs',
    },
  })

  for (const artifact of [
    'index.js',
    'index.cjs',
    'index.d.ts',
    'index.d.cts',
  ]) {
    assert.ok(
      existsSync(new URL(`../dist/${artifact}`, import.meta.url)),
      artifact,
    )
  }
})
