import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { after, test } from 'node:test'

import { Linter } from 'eslint'
import tseslint from 'typescript-eslint'

import aiRules from '../dist/index.js'

const tempRoot = mkdtempSync(path.join(process.cwd(), '.tmp-relations-'))
const relativeRoot = path.basename(tempRoot)

function write(relativePath, content) {
  const fullPath = path.join(tempRoot, relativePath)

  mkdirSync(path.dirname(fullPath), { recursive: true })
  writeFileSync(fullPath, content)
}

write(
  'tsconfig.json',
  JSON.stringify({
    compilerOptions: {
      paths: {
        '@/*': ['./src/*'],
      },
    },
  }),
)
write('src/repositories/UserRepository.ts', 'export const repo = 1\n')
write('src/use-case/GetUser.ts', 'export const getUser = 1\n')
write('src/services/UserService.ts', 'export const service = 1\n')
write('src/helpers/Format.ts', 'export const format = 1\n')
write('src/shared/Shared.ts', 'export const shared = 1\n')
write('src/other/Unknown.ts', 'export const unknown = 1\n')
write('src/http/controllers/AnotherController.ts', 'export const another = 1\n')
write('src/features/orders/controllers/OrdersController.ts', 'export const orders = 1\n')

after(() => {
  rmSync(tempRoot, { recursive: true, force: true })
})

const baseLayers = {
  controller: 'src/http/controllers',
  useCase: 'src/use-case',
  repository: 'src/repositories',
  service: 'src/services',
  helper: 'src/helpers',
}

function buildConfig(relations) {
  const [config] = aiRules.configs.projects([
    {
      rootFolder: relativeRoot,
      preset: 'other',
      relations,
    },
  ])

  return config
}

function lint(config, relativeFile, code) {
  return new Linter().verify(
    code,
    {
      files: ['**/*.ts'],
      plugins: config.plugins,
      settings: config.settings,
      languageOptions: { parser: tseslint.parser },
      rules: {
        'ai-rules/dependencies':
          config.rules['ai-rules/dependencies'],
      },
    },
    { filename: path.join(tempRoot, relativeFile) },
  )
}

const allowConfig = buildConfig({
  layers: baseLayers,
  rules: [
    { from: 'controller', allow: ['useCase', 'helper'] },
    { from: 'useCase', allow: ['repository', 'service', 'helper'] },
    { from: 'repository', allow: ['helper'] },
    { from: 'service', allow: ['repository', 'helper'] },
    { from: 'helper', allow: [] },
  ],
})

const allowTypeConfig = buildConfig({
  allowTypeImports: true,
  layers: baseLayers,
  rules: [
    { from: 'controller', allow: ['useCase', 'helper'] },
    { from: 'useCase', allow: ['repository', 'service', 'helper'] },
    { from: 'repository', allow: ['helper'] },
    { from: 'service', allow: ['repository', 'helper'] },
    { from: 'helper', allow: [] },
  ],
})

const denyConfig = buildConfig({
  layers: baseLayers,
  rules: [
    {
      from: 'controller',
      deny: ['repository'],
      message: 'Controllers must use use-cases instead of repositories.',
    },
  ],
})

const perRuleTypeConfig = buildConfig({
  layers: baseLayers,
  rules: [
    {
      from: 'controller',
      allow: ['useCase', 'helper'],
      allowTypeImports: true,
    },
    { from: 'useCase', allow: ['repository', 'service', 'helper'] },
    { from: 'repository', allow: ['helper'] },
    { from: 'service', allow: ['repository', 'helper'] },
    { from: 'helper', allow: [] },
  ],
})

const perRuleTypeDeniedConfig = buildConfig({
  allowTypeImports: true,
  layers: baseLayers,
  rules: [
    {
      from: 'controller',
      allow: ['useCase', 'helper'],
      allowTypeImports: false,
    },
    { from: 'useCase', allow: ['repository', 'service', 'helper'] },
    { from: 'repository', allow: ['helper'] },
    { from: 'service', allow: ['repository', 'helper'] },
    { from: 'helper', allow: [] },
  ],
})

const multiPathConfig = buildConfig({
  layers: {
    ...baseLayers,
    helper: ['src/helpers', 'src/shared'],
  },
  rules: [
    { from: 'controller', allow: ['helper'] },
  ],
})

const globLayerConfig = buildConfig({
  layers: {
    featureController: 'src/features/*/controllers',
    repository: 'src/repositories',
  },
  rules: [
    { from: 'featureController', deny: ['repository'] },
  ],
})

test('allows controller to import use-case and helper', () => {
  assert.equal(
    lint(
      allowConfig,
      'src/http/controllers/TestController.ts',
      "import { getUser } from '@/use-case/GetUser'\nimport { format } from '@/helpers/Format'\n",
    ).length,
    0,
  )
})

test('blocks controller from importing repository through alias', () => {
  const messages = lint(
    allowConfig,
    'src/http/controllers/TestController.ts',
    "import { repo } from '@/repositories/UserRepository'\n",
  )

  assert.equal(messages.length, 1)
  assert.match(messages[0].message, /repository/)
  assert.match(messages[0].message, /controller/)
})

test('blocks repository imports in nested controller folders', () => {
  const messages = lint(
    allowConfig,
    'src/http/controllers/product/TestController.ts',
    "import { repo } from '@/repositories/UserRepository'\n",
  )

  assert.equal(messages.length, 1)
})

test('blocks type-only imports by default', () => {
  const messages = lint(
    allowConfig,
    'src/http/controllers/TestController.ts',
    "import type { TUser } from '@/repositories/UserRepository'\n",
  )

  assert.equal(messages.length, 1)
})

test('allows type-only imports when enabled', () => {
  assert.equal(
    lint(
      allowTypeConfig,
      'src/http/controllers/TestController.ts',
      "import type { TUser } from '@/repositories/UserRepository'\n",
    ).length,
    0,
  )
})

test('allows use-case to import repository', () => {
  assert.equal(
    lint(
      allowConfig,
      'src/use-case/GetUser.ts',
      "import { repo } from '@/repositories/UserRepository'\n",
    ).length,
    0,
  )
})

test('blocks repository from importing use-case', () => {
  const messages = lint(
    allowConfig,
    'src/repositories/UserRepository.ts',
    "import { getUser } from '@/use-case/GetUser'\n",
  )

  assert.equal(messages.length, 1)
})

test('allows same-layer and external imports', () => {
  assert.equal(
    lint(
      allowConfig,
      'src/http/controllers/TestController.ts',
      "import { another } from '@/http/controllers/AnotherController'\nimport { existsSync } from 'node:fs'\n",
    ).length,
    0,
  )
})

test('supports deny rules with custom messages', () => {
  const messages = lint(
    denyConfig,
    'src/http/controllers/TestController.ts',
    "import { repo } from '@/repositories/UserRepository'\n",
  )

  assert.equal(messages.length, 1)
  assert.match(messages[0].message, /Controllers must use use-cases/)
})

test('supports per-rule type import overrides', () => {
  assert.equal(
    lint(
      perRuleTypeConfig,
      'src/http/controllers/TestController.ts',
      "import type { TUser } from '@/repositories/UserRepository'\n",
    ).length,
    0,
  )

  assert.equal(
    lint(
      perRuleTypeDeniedConfig,
      'src/http/controllers/TestController.ts',
      "import type { TUser } from '@/repositories/UserRepository'\n",
    ).length,
    1,
  )
})

test('blocks type-only imports in deny rules by default', () => {
  assert.equal(
    lint(
      denyConfig,
      'src/http/controllers/TestController.ts',
      "import type { TUser } from '@/repositories/UserRepository'\n",
    ).length,
    1,
  )
})

test('checks dynamic imports and re-exports', () => {
  assert.equal(
    lint(
      allowConfig,
      'src/http/controllers/TestController.ts',
      "import('@/repositories/UserRepository')\n",
    ).length,
    1,
  )

  assert.equal(
    lint(
      allowConfig,
      'src/http/controllers/TestController.ts',
      "export { repo } from '@/repositories/UserRepository'\n",
    ).length,
    1,
  )
})

test('allows imports from files outside any layer', () => {
  assert.equal(
    lint(
      allowConfig,
      'src/http/controllers/TestController.ts',
      "import { unknown } from '@/other/Unknown'\n",
    ).length,
    0,
  )
})

test('supports layers with multiple paths', () => {
  assert.equal(
    lint(
      multiPathConfig,
      'src/http/controllers/TestController.ts',
      "import { format } from '@/helpers/Format'\nimport { shared } from '@/shared/Shared'\n",
    ).length,
    0,
  )
})

test('supports glob patterns in layers', () => {
  assert.equal(
    lint(
      globLayerConfig,
      'src/features/orders/controllers/OrdersController.ts',
      "import { repo } from '@/repositories/UserRepository'\n",
    ).length,
    1,
  )
})

test('works for JS projects without tsconfig', () => {
  const jsRoot = mkdtempSync(path.join(process.cwd(), '.tmp-relations-js-'))

  try {
    const writeJs = (relativePath, content) => {
      const fullPath = path.join(jsRoot, relativePath)

      mkdirSync(path.dirname(fullPath), { recursive: true })
      writeFileSync(fullPath, content)
    }

    writeJs(
      'src/repositories/UserRepository.js',
      'export const repo = 1\n',
    )

    const [config] = aiRules.configs.projects([
      {
        rootFolder: path.basename(jsRoot),
        preset: 'other',
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
    ])

    const messages = new Linter().verify(
      "import { repo } from '../../repositories/UserRepository.js'\n",
      {
        files: ['**/*.js'],
        plugins: config.plugins,
        settings: config.settings,
        languageOptions: {
          ecmaVersion: 2022,
          sourceType: 'module',
        },
        rules: {
          'ai-rules/dependencies':
            config.rules['ai-rules/dependencies'],
        },
      },
      {
        filename: path.join(
          jsRoot,
          'src/http/controllers/TestController.js',
        ),
      },
    )

    assert.equal(messages.length, 1)
  } finally {
    rmSync(jsRoot, { recursive: true, force: true })
  }
})
