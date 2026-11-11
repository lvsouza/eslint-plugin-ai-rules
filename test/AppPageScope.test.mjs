import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { after, test } from 'node:test'

import { ESLint } from 'eslint'
import tseslint from 'typescript-eslint'

import aiRules from '../dist/index.js'

const tempRoot = mkdtempSync(path.join(process.cwd(), '.tmp-app-page-scope-'))
const relativeTempRoot = path.basename(tempRoot)
const projectRoot = `${relativeTempRoot}/project`

function write(relativePath, content) {
  const fullPath = path.join(tempRoot, relativePath)

  mkdirSync(path.dirname(fullPath), { recursive: true })
  writeFileSync(fullPath, content)
}

function writeJson(relativePath, value) {
  write(relativePath, JSON.stringify(value, null, 2))
}

after(() => {
  rmSync(tempRoot, { recursive: true, force: true })
})

writeJson('project/tsconfig.json', {
  compilerOptions: {
    paths: {
      '@/*': ['./src/*'],
    },
  },
})

for (const file of [
  'src/shared/pages/orders/components/OrderCard.tsx',
  'src/shared/pages/orders/helpers.ts',
  'src/shared/pages/users/components/UserCard.tsx',
  'src/shared/pages/users/helpers.ts',
  'src/shared/pages/dashboard/components/DashboardCard.tsx',
]) {
  write(`project/${file}`, 'export const value = 1\n')
}

write(
  'project/src/app/orders/page.tsx',
  "import { OrderCard } from '@/shared/pages/orders/components/OrderCard'\nexport default function Page() { return OrderCard }\n",
)
write(
  'project/src/app/users/page.tsx',
  "import { OrderCard } from '@/shared/pages/orders/components/OrderCard'\nexport default function Page() { return OrderCard }\n",
)
write(
  'project/src/app/(shop)/orders/[id]/page.tsx',
  "import { UserCard } from '@/shared/pages/users/components/UserCard'\nexport default function Page() { return UserCard }\n",
)
write(
  'project/src/app/dashboard/@modal/default.tsx',
  "import { DashboardCard } from '@/shared/pages/dashboard/components/DashboardCard'\nexport default function Default() { return DashboardCard }\n",
)
write(
  'project/src/app/page.tsx',
  "import { UserCard } from '@/shared/pages/users/components/UserCard'\nexport default function Page() { return UserCard }\n",
)

const configs = aiRules.configs.projects([
  { rootFolder: projectRoot, preset: 'nextjs' },
])

function lintFiles(files) {
  const eslint = new ESLint({
    cwd: process.cwd(),
    overrideConfigFile: true,
    overrideConfig: [
      ...tseslint.configs.recommended,
      ...configs,
    ],
  })

  return eslint.lintFiles(files)
}

function messagesFor(results, ruleId) {
  return results.flatMap((result) =>
    result.messages.filter((message) => message.ruleId === ruleId),
  )
}

test('app-page-scope allows same-page resources', async () => {
  const results = await lintFiles([
    path.join(tempRoot, 'project/src/app/orders/page.tsx'),
    path.join(tempRoot, 'project/src/app/dashboard/@modal/default.tsx'),
    path.join(tempRoot, 'project/src/app/page.tsx'),
  ])

  assert.equal(messagesFor(results, 'ai-rules/app-page-scope').length, 0)
})

test('app-page-scope blocks cross-page resources', async () => {
  const results = await lintFiles([
    path.join(tempRoot, 'project/src/app/users/page.tsx'),
    path.join(tempRoot, 'project/src/app/(shop)/orders/[id]/page.tsx'),
  ])
  const messages = messagesFor(results, 'ai-rules/app-page-scope')

  assert.equal(messages.length, 2)
  assert.ok(messages.every((message) => /users/.test(message.message)))
})

test('app-page-scope resolves relative imports', async () => {
  write(
    'project/src/app/about/page.tsx',
    "import { UserCard } from '../../shared/pages/users/components/UserCard'\nexport default function Page() { return UserCard }\n",
  )

  const results = await lintFiles([
    path.join(tempRoot, 'project/src/app/about/page.tsx'),
  ])

  assert.equal(
    messagesFor(results, 'ai-rules/app-page-scope').length,
    1,
  )
})
