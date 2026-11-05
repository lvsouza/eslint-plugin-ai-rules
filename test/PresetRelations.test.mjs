import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { after, test } from 'node:test'

import { Linter } from 'eslint'
import tseslint from 'typescript-eslint'

import aiRules from '../dist/index.js'

const tempRoot = mkdtempSync(path.join(process.cwd(), '.tmp-preset-relations-'))
const relativeTempRoot = path.basename(tempRoot)

function write(relativePath, content) {
  const fullPath = path.join(tempRoot, relativePath)

  mkdirSync(path.dirname(fullPath), { recursive: true })
  writeFileSync(fullPath, content)
}

function writeJson(relativePath, value) {
  write(relativePath, JSON.stringify(value, null, 2))
}

function writeProjectFile(projectRoot, relativePath, content) {
  write(`${projectRoot}/${relativePath}`, content)
}

function writeProjectJson(projectRoot, relativePath, value) {
  writeJson(`${projectRoot}/${relativePath}`, value)
}

after(() => {
  rmSync(tempRoot, { recursive: true, force: true })
})

const backendDir = 'backend'
const frontendDir = 'frontend'
const backendRoot = `${relativeTempRoot}/${backendDir}`
const frontendRoot = `${relativeTempRoot}/${frontendDir}`

writeProjectJson(backendDir, 'tsconfig.json', {
  compilerOptions: { paths: { '@/*': ['./src/*'] } },
})
writeProjectJson(frontendDir, 'tsconfig.json', {
  compilerOptions: { paths: { '@/*': ['./src/*'] } },
})

for (const file of [
  'src/http/controllers/Test.ts',
  'src/use-case/Test.ts',
  'src/use-case/Get.ts',
  'src/use-case/Errors.ts',
  'src/repositories/File.ts',
  'src/repositories/Setup.ts',
  'src/services/Auth.ts',
  'src/services/TokenStore.ts',
  'src/services/generated/service/client.ts',
  'src/services/generated/service/models/index.ts',
  'src/services/file-provider/index.ts',
  'src/services/file-provider/Types.ts',
  'src/services/notification/index.ts',
  'src/database/Connection.ts',
  'src/database/schema/index.ts',
  'src/database/schema/File.ts',
  'src/helpers/Format.ts',
  'src/env/index.ts',
  'src/http/hooks/Auth.ts',
]) {
  writeProjectFile(backendDir, file, 'export const value = 1\n')
}

for (const file of [
  'src/shared/components/Button.tsx',
  'src/shared/components/ui/Input.tsx',
  'src/shared/hooks/UseAuth.ts',
  'src/shared/contexts/AuthContext.tsx',
  'src/shared/services/AuthService.ts',
  'src/shared/services/OtherService.ts',
  'src/shared/services/generated/client.ts',
  'src/shared/utils/Format.ts',
  'src/shared/helpers/Format.ts',
  'src/shared/constants/Values.ts',
  'src/shared/env/index.ts',
  'src/pages/orders/Orders.tsx',
  'src/pages/orders/helpers.ts',
  'src/pages/users/helpers.ts',
  'src/pages/orders/components/OrderCard.tsx',
  'src/pages/orders/hooks/UseOrders.ts',
  'src/pages/orders/services/Orders.ts',
  'src/pages/orders/contexts/OrdersContext.tsx',
  'src/pages/orders/helpers/Format.ts',
  'src/pages/users/components/UserCard.tsx',
]) {
  writeProjectFile(frontendDir, file, 'export const value = 1\n')
}

const [backendConfig] = aiRules.configs.projects([
  { rootFolder: backendRoot, preset: 'backend' },
])
const [frontendConfig] = aiRules.configs.projects([
  { rootFolder: frontendRoot, preset: 'frontend' },
])

function lint(config, projectDir, relativeFile, code) {
  return new Linter().verify(
    code,
    {
      files: ['**/*.{ts,tsx}'],
      plugins: config.plugins,
      settings: config.settings,
      languageOptions: { parser: tseslint.parser },
      rules: {
        'ai-rules/dependencies':
          config.rules['ai-rules/dependencies'],
      },
    },
    { filename: path.join(tempRoot, projectDir, relativeFile) },
  )
}

function backendLint(relativeFile, code) {
  return lint(backendConfig, backendDir, relativeFile, code)
}

function frontendLint(relativeFile, code) {
  return lint(frontendConfig, frontendDir, relativeFile, code)
}

test('backend preset allows controller infrastructure and use-case imports', () => {
  assert.equal(
    backendLint(
      'src/http/controllers/Test.ts',
      "import '@/use-case/Get'\nimport '@/http/hooks/Auth'\nimport '@/helpers/Format'\nimport '@/env'\nimport '@/services/generated/service/client'\n",
    ).length,
    0,
  )
})

test('backend preset blocks controller repository, service and database imports', () => {
  for (const source of [
    "import '@/repositories/File'\n",
    "import '@/services/Auth'\n",
    "import '@/database/Connection'\n",
  ]) {
    assert.equal(
      backendLint('src/http/controllers/Test.ts', source).length,
      1,
      source,
    )
  }
})

test('backend preset enforces use-case dependencies', () => {
  assert.equal(
    backendLint(
      'src/use-case/Test.ts',
      "import '@/repositories/File'\nimport '@/services/Auth'\nimport '@/services/generated/service/client'\nimport '@/services/file-provider/index'\nimport '@/use-case/Errors'\n",
    ).length,
    0,
  )
  assert.equal(
    backendLint(
      'src/use-case/Test.ts',
      "import '@/database/Connection'\n",
    ).length,
    1,
  )
  assert.equal(
    backendLint(
      'src/use-case/Test.ts',
      "import '@/helpers/Format'\n",
    ).length,
    1,
  )
})

test('backend preset blocks repository to repository and service to service', () => {
  assert.equal(
    backendLint(
      'src/repositories/File.ts',
      "import './Setup'\n",
    ).length,
    1,
  )
  assert.equal(
    backendLint(
      'src/services/Auth.ts',
      "import './TokenStore'\n",
    ).length,
    1,
  )
})

test('backend preset allows structural same-layer exceptions', () => {
  assert.equal(
    backendLint(
      'src/services/generated/service/client.ts',
      "import './models'\n",
    ).length,
    0,
  )
  assert.equal(
    backendLint(
      'src/services/file-provider/index.ts',
      "import './Types'\nimport '@/env'\n",
    ).length,
    0,
  )
  assert.equal(
    backendLint(
      'src/database/schema/index.ts',
      "import './File'\n",
    ).length,
    0,
  )
})

test('backend preset blocks imports between different service modules', () => {
  assert.equal(
    backendLint(
      'src/services/file-provider/index.ts',
      "import '@/services/notification'\n",
    ).length,
    1,
  )
})

test('frontend preset allows local to global and same-page local imports', () => {
  assert.equal(
    frontendLint(
      'src/pages/orders/Orders.tsx',
      "import '@/shared/components/Button'\nimport '@/shared/services/AuthService'\nimport '@/pages/orders/components/OrderCard'\n",
    ).length,
    0,
  )
})

test('frontend preset allows page same-scope imports', () => {
  assert.equal(
    frontendLint(
      'src/pages/orders/Orders.tsx',
      "import './helpers'\n",
    ).length,
    0,
  )
  assert.equal(
    frontendLint(
      'src/pages/orders/components/OrderCard.tsx',
      "import '@/pages/orders/helpers'\n",
    ).length,
    0,
  )
})

test('frontend preset blocks cross-page page imports', () => {
  assert.equal(
    frontendLint(
      'src/pages/orders/Orders.tsx',
      "import '@/pages/users/helpers'\n",
    ).length,
    1,
  )
})

test('frontend preset blocks global to local and cross-page imports', () => {
  assert.equal(
    frontendLint(
      'src/shared/components/Button.tsx',
      "import '@/pages/orders/components/OrderCard'\n",
    ).length,
    1,
  )
  assert.equal(
    frontendLint(
      'src/pages/orders/components/OrderCard.tsx',
      "import '@/pages/users/components/UserCard'\n",
    ).length,
    1,
  )
})

test('frontend preset blocks pageHook importing pageComponent', () => {
  assert.equal(
    frontendLint(
      'src/pages/orders/hooks/UseOrders.ts',
      "import '@/pages/orders/components/OrderCard'\n",
    ).length,
    1,
  )
})

test('frontend preset allows pageService and pageContext global dependencies', () => {
  assert.equal(
    frontendLint(
      'src/pages/orders/services/Orders.ts',
      "import '@/shared/services/AuthService'\n",
    ).length,
    0,
  )
  assert.equal(
    frontendLint(
      'src/pages/orders/contexts/OrdersContext.tsx',
      "import '@/shared/services/AuthService'\nimport '@/pages/orders/services/Orders'\n",
    ).length,
    0,
  )
})

test('frontend preset allows utils and helpers cross imports', () => {
  assert.equal(
    frontendLint(
      'src/shared/utils/Format.ts',
      "import '@/shared/helpers/Format'\nimport '@/shared/constants/Values'\n",
    ).length,
    0,
  )
  assert.equal(
    frontendLint(
      'src/shared/helpers/Format.ts',
      "import '@/shared/utils/Format'\nimport '@/shared/constants/Values'\n",
    ).length,
    0,
  )
})

test('frontend preset blocks same-layer services and allows same-layer components', () => {
  assert.equal(
    frontendLint(
      'src/shared/services/AuthService.ts',
      "import '@/shared/services/OtherService'\n",
    ).length,
    1,
  )
  assert.equal(
    frontendLint(
      'src/shared/components/Button.tsx',
      "import '@/shared/components/ui/Input'\n",
    ).length,
    0,
  )
})
