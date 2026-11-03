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
  assert.deepEqual(Object.keys(presets), ['frontend', 'backend', 'other'])
})

test('CJS exports are wired correctly', () => {
  assert.equal(typeof cjs.default.configs.projects, 'function')
  assert.equal(typeof cjs.projects, 'function')
  assert.equal(cjs.default.rules['project-setup'], cjs.projectSetup)
  assert.equal(cjs.default.rules['project-structure'], cjs.projectStructure)
  assert.deepEqual(Object.keys(cjs.presets), ['frontend', 'backend', 'other'])
})

test('build artifacts and package metadata exist', () => {
  const packageJson = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
  )

  assert.equal(aiRules.meta.version, packageJson.version)
  assert.equal(packageJson.main, './dist/index.cjs')
  assert.equal(packageJson.module, './dist/index.js')
  assert.equal(packageJson.types, './dist/index.d.ts')
  assert.deepEqual(packageJson.files, ['dist'])
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
