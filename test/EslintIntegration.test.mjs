import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { after, test } from 'node:test'

import { ESLint } from 'eslint'
import tseslint from 'typescript-eslint'

import aiRules from '../dist/index.js'

const tempRoot = mkdtempSync(path.join(process.cwd(), 'tmp-eslint-'))
const relativeTempRoot = path.basename(tempRoot)

function write(relativePath, content) {
  const fullPath = path.join(tempRoot, relativePath)

  mkdirSync(path.dirname(fullPath), { recursive: true })
  writeFileSync(fullPath, content)
}

function writeJson(relativePath, value) {
  write(relativePath, JSON.stringify(value, null, 2))
}

function projectPath(relativePath) {
  return `${relativeTempRoot}/${relativePath}`
}

async function lint(configs, files) {
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

after(() => {
  rmSync(tempRoot, { recursive: true, force: true })
})

test('ESLint applies project-structure through the generated config', async () => {
  const root = projectPath('structure')

  write('structure/src/index.ts', 'export const value = 1\n')
  write('structure/src/invalid/Bad.ts', 'export const bad = 1\n')

  const [config] = aiRules.configs.projects([
    {
      rootFolder: root,
      preset: 'other',
      structure: {
        folders: {
          src: {
            files: ['index.ts'],
          },
        },
      },
    },
  ])

  const results = await lint(
    [config],
    [
      projectPath('structure/src/index.ts'),
      projectPath('structure/src/invalid/Bad.ts'),
    ],
  )

  const messages = messagesFor(results, 'ai-rules/project-structure')

  assert.equal(messages.length, 1)
  assert.equal(messages[0].messageId, 'folderNotAllowed')
})

test('ESLint applies standard rule overrides after the generated config', async () => {
  const root = projectPath('overrides')

  write(
    'overrides/src/Invalid/Bad.ts',
    "import { b } from 'b';\nimport { a } from 'a';\nexport const value = a + b;\n",
  )

  const [config] = aiRules.configs.projects([
    {
      rootFolder: root,
      preset: 'other',
      structure: {
        folders: {
          src: {
            files: ['index.ts'],
          },
        },
      },
    },
  ])

  const results = await lint(
    [
      config,
      {
        rules: {
          'ai-rules/project-structure': 'off',
          'ai-rules/sort-imports': 'off',
          '@stylistic/semi': ['warn', 'never'],
        },
      },
    ],
    [projectPath('overrides/src/Invalid/Bad.ts')],
  )

  assert.equal(messagesFor(results, 'ai-rules/project-structure').length, 0)
  assert.equal(messagesFor(results, 'ai-rules/sort-imports').length, 0)

  const semiMessages = messagesFor(results, '@stylistic/semi')

  assert.ok(semiMessages.length > 0)
  assert.ok(semiMessages.every((message) => message.severity === 1))
})

test('ESLint applies per-project rule overrides', async () => {
  const root = projectPath('project-rules')

  write('project-rules/src/invalid/Bad.ts', 'export const value = 1\n')

  const [config] = aiRules.configs.projects([
    {
      rootFolder: root,
      preset: 'other',
      structure: {
        folders: {
          src: {
            files: ['index.ts'],
          },
        },
      },
      rules: {
        'ai-rules/project-structure': 'warn',
      },
    },
  ])

  const results = await lint(
    [config],
    [projectPath('project-rules/src/invalid/Bad.ts')],
  )
  const messages = messagesFor(results, 'ai-rules/project-structure')

  assert.equal(messages.length, 1)
  assert.equal(messages[0].severity, 1)
})

test('ESLint applies rule overrides for boundaries', async () => {
  const root = projectPath('relations-overrides')

  writeJson('relations-overrides/tsconfig.json', {
    compilerOptions: {
      paths: {
        '@/*': ['./src/*'],
      },
    },
  })
  write('relations-overrides/src/repositories/UserRepository.ts', 'export const repo = 1\n')
  write(
    'relations-overrides/src/http/controllers/InvalidController.ts',
    "import { repo } from '@/repositories/UserRepository'\nexport const value = repo\n",
  )

  const [config] = aiRules.configs.projects([
    {
      rootFolder: root,
      preset: 'other',
      relations: {
        layers: {
          controller: 'src/http/controllers',
          repository: 'src/repositories',
        },
        rules: [
          { from: 'controller', allow: [] },
        ],
      },
      rules: {
        'boundaries/dependencies': 'off',
      },
    },
  ])

  const results = await lint(
    [config],
    [projectPath('relations-overrides/src/http/controllers/InvalidController.ts')],
  )

  assert.equal(messagesFor(results, 'boundaries/dependencies').length, 0)
})

test('ESLint applies relations with aliases through the generated config', async () => {
  const root = projectPath('relations')

  writeJson('relations/tsconfig.json', {
    compilerOptions: {
      paths: {
        '@/*': ['./src/*'],
      },
    },
  })
  write('relations/src/repositories/UserRepository.ts', 'export const repo = 1\n')
  write('relations/src/use-case/GetUser.ts', 'export const getUser = 1\n')
  write(
    'relations/src/http/controllers/ValidController.ts',
    "import { getUser } from '@/use-case/GetUser'\n",
  )
  write(
    'relations/src/http/controllers/InvalidController.ts',
    "import { repo } from '@/repositories/UserRepository'\n",
  )
  write(
    'relations/src/http/controllers/TypeController.ts',
    "import type { TUser } from '@/repositories/UserRepository'\n",
  )

  const [config] = aiRules.configs.projects([
    {
      rootFolder: root,
      preset: 'other',
      relations: {
        layers: {
          controller: 'src/http/controllers',
          useCase: 'src/use-case',
          repository: 'src/repositories',
        },
        rules: [
          { from: 'controller', allow: ['useCase'] },
          { from: 'useCase', allow: ['repository'] },
          { from: 'repository', allow: [] },
        ],
      },
    },
  ])

  const validResults = await lint(
    [config],
    [projectPath('relations/src/http/controllers/ValidController.ts')],
  )
  const invalidResults = await lint(
    [config],
    [
      projectPath('relations/src/http/controllers/InvalidController.ts'),
      projectPath('relations/src/http/controllers/TypeController.ts'),
    ],
  )

  assert.equal(messagesFor(validResults, 'boundaries/dependencies').length, 0)
  assert.equal(messagesFor(invalidResults, 'boundaries/dependencies').length, 2)
})

test('ESLint applies nested parent and child configs correctly', async () => {
  const root = projectPath('nested')
  const childRoot = projectPath('nested/apps/api')

  write('nested/root.ts', 'export const root = 1\n')
  write('nested/bad.ts', 'export const bad = 1\n')
  write('nested/apps/api/src/index.ts', 'export const api = 1\n')
  write('nested/apps/api/src/Http.ts', 'export const http = 1\n')

  const configs = aiRules.configs.projects([
    {
      rootFolder: root,
      preset: 'other',
      structure: {
        files: ['root.ts'],
      },
    },
    {
      rootFolder: childRoot,
      preset: 'backend',
    },
  ])

  const results = await lint(
    configs,
    [
      projectPath('nested/root.ts'),
      projectPath('nested/bad.ts'),
      projectPath('nested/apps/api/src/index.ts'),
      projectPath('nested/apps/api/src/Http.ts'),
    ],
  )
  const messages = messagesFor(results, 'ai-rules/project-structure')

  assert.equal(messages.length, 2)
  assert.deepEqual(
    messages.map((message) => message.messageId).sort(),
    ['fileNotAllowed', 'fileNotAllowed'],
  )
})
