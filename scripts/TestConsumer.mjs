import { execFileSync, spawnSync } from 'node:child_process'
import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)))
const tempRoot = mkdtempSync(path.join(tmpdir(), 'ai-rules-consumer-'))
const tarballDir = path.join(tempRoot, 'tarball')
const consumerDir = path.join(tempRoot, 'consumer')
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const eslintVersion = process.env.ESLINT_VERSION ?? '^10.0.0'
const warningText = 'Project structure validation is not configured'

function run(command, args, options) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    ...options,
  })
}

function write(relativePath, content) {
  const fullPath = path.join(consumerDir, relativePath)

  mkdirSync(path.dirname(fullPath), { recursive: true })
  writeFileSync(fullPath, content)
}

function writeConfig(content) {
  write('eslint.config.mjs', content)
}

function outputOf(result) {
  return `${result.stdout}\n${result.stderr}`
}

function assertSuccess(result, label) {
  if (result.status !== 0) {
    throw new Error(
      `${label} failed.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    )
  }
}

function assertFailure(result, label, expectedText) {
  const output = outputOf(result)

  if (result.status === 0 || !output.includes(expectedText)) {
    throw new Error(
      `${label} did not fail with "${expectedText}".\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    )
  }
}

function assertNoWarning(result, label) {
  assertSuccess(result, label)

  if (outputOf(result).includes(warningText)) {
    throw new Error(`${label} unexpectedly printed the setup warning.`)
  }
}

function runEslint(target, options = {}) {
  return run(
    npxCommand,
    ['--no-install', 'eslint', target],
    {
      cwd: consumerDir,
      ...options,
    },
  )
}

function structureConfig() {
  return `import aiRules from 'eslint-plugin-ai-rules'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

const structure = {
  files: ['package.json', 'eslint.config.mjs'],
  folders: {
    src: {
      files: ['index.ts'],
    },
  },
}

export default defineConfig([
  ...tseslint.configs.recommended,
  ...aiRules.configs.projects([
    {
      rootFolder: '.',
      preset: 'other',
      structure,
    },
  ]),
])
`
}

function structureOptOutConfig() {
  return `import aiRules from 'eslint-plugin-ai-rules'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

const structure = {
  files: ['package.json', 'eslint.config.mjs'],
  folders: {
    src: {
      files: ['index.ts'],
    },
  },
}

export default defineConfig([
  ...tseslint.configs.recommended,
  ...aiRules.configs.projects([
    {
      rootFolder: '.',
      preset: 'other',
      structure,
      rules: {
        'ai-rules/project-structure': 'off',
      },
    },
  ]),
])
`
}

function relationsConfig(allowTypeImports = false) {
  return `import aiRules from 'eslint-plugin-ai-rules'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig([
  ...tseslint.configs.recommended,
  ...aiRules.configs.projects([
    {
      rootFolder: '.',
      preset: 'other',
      relations: {
        allowTypeImports: ${allowTypeImports},
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
  ]),
])
`
}

function recommendedConfig() {
  return `import aiRules from 'eslint-plugin-ai-rules'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig([
  ...tseslint.configs.recommended,
  ...aiRules.configs.recommended,
])
`
}

function otherConfig() {
  return `import aiRules from 'eslint-plugin-ai-rules'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig([
  ...tseslint.configs.recommended,
  ...aiRules.configs.projects([
    { rootFolder: '.', preset: 'other' },
  ]),
])
`
}

try {
  mkdirSync(tarballDir, { recursive: true })
  mkdirSync(consumerDir, { recursive: true })

  const packOutput = execFileSync(
    npmCommand,
    ['pack', '--silent', '--pack-destination', tarballDir],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'inherit'],
    },
  )
  const tarballName = packOutput.trim().split(/\r?\n/).filter(Boolean).at(-1)
  const tarballPath = path.join(tarballDir, tarballName)

  write(
    'package.json',
    JSON.stringify(
      {
        name: 'ai-rules-consumer',
        private: true,
        type: 'module',
      },
      null,
      2,
    ),
  )

  const installResult = run(
    npmCommand,
    [
      'install',
      '--no-audit',
      '--no-fund',
      '--ignore-scripts',
      '--no-package-lock',
      '--prefer-offline',
      tarballPath,
      `eslint@${eslintVersion}`,
      'typescript@>=5.0.0 <6.1.0',
      'typescript-eslint@^8.0.0',
    ],
    {
      cwd: consumerDir,
      stdio: 'inherit',
    },
  )
  assertSuccess(installResult, 'consumer install')

  writeConfig(structureConfig())
  write('src/index.ts', 'export const value = 1\n')

  const validResult = runEslint('src/index.ts')
  assertSuccess(validResult, 'consumer eslint valid structure file')

  write('src/invalid/Bad.ts', 'export const bad = 1\n')

  const invalidResult = runEslint('src/invalid/Bad.ts')
  assertFailure(
    invalidResult,
    'consumer eslint invalid structure file',
    'ai-rules/project-structure',
  )

  writeConfig(structureOptOutConfig())
  assertSuccess(
    runEslint('src/invalid/Bad.ts'),
    'consumer eslint project rule opt-out',
  )

  writeConfig(structureConfig())

  write(
    'tsconfig.json',
    JSON.stringify(
      {
        compilerOptions: {
          paths: {
            '@/*': ['./src/*'],
          },
        },
      },
      null,
      2,
    ),
  )
  write('src/repositories/UserRepository.ts', 'export const repo = 1\n')
  write('src/use-case/GetUser.ts', 'export const getUser = 1\n')
  write(
    'src/http/controllers/ValidController.ts',
    "import '@/use-case/GetUser'\n",
  )
  write(
    'src/http/controllers/InvalidController.ts',
    "import '@/repositories/UserRepository'\n",
  )
  write(
    'src/http/controllers/TypeController.ts',
    "import type { TUser } from '@/repositories/UserRepository'\n\n\nexport type TControllerUser = TUser\n",
  )

  writeConfig(relationsConfig())
  assertSuccess(
    runEslint('src/http/controllers/ValidController.ts'),
    'consumer eslint valid relation',
  )

  assertFailure(
    runEslint('src/http/controllers/InvalidController.ts'),
    'consumer eslint invalid relation',
    'ai-rules/dependencies',
  )

  assertFailure(
    runEslint('src/http/controllers/TypeController.ts'),
    'consumer eslint blocked type-only relation',
    'ai-rules/dependencies',
  )

  writeConfig(relationsConfig(true))
  assertSuccess(
    runEslint('src/http/controllers/TypeController.ts'),
    'consumer eslint allowed type-only relation',
  )

  writeConfig(recommendedConfig())
  const warningResult = runEslint('src/index.ts')

  assertSuccess(warningResult, 'consumer eslint setup warning')
  if (!outputOf(warningResult).includes(warningText)) {
    throw new Error('consumer eslint did not print the setup warning.')
  }

  write('src/Default.ts', 'export default 1\n')
  assertFailure(
    runEslint('src/Default.ts'),
    'consumer eslint default export',
    'ai-rules/no-default-export',
  )

  writeConfig(otherConfig())
  assertNoWarning(
    runEslint('src/index.ts'),
    'consumer eslint other preset warning suppression',
  )

  writeConfig(recommendedConfig())
  assertNoWarning(
    runEslint('src/index.ts', {
      env: {
        ...process.env,
        AI_RULES_SILENT: '1',
      },
    }),
    'consumer eslint AI_RULES_SILENT warning suppression',
  )

  const esmResult = run(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      "import pkg from 'eslint-plugin-ai-rules'; if (typeof pkg.configs.projects !== 'function' || !pkg.rules['project-structure']) process.exit(1)",
    ],
    { cwd: consumerDir, stdio: 'inherit' },
  )
  assertSuccess(esmResult, 'consumer ESM import')

  const cjsResult = run(
    process.execPath,
    [
      '-e',
      "const pkg = require('eslint-plugin-ai-rules'); if (typeof pkg.default.configs.projects !== 'function' || typeof pkg.projects !== 'function') process.exit(1)",
    ],
    { cwd: consumerDir, stdio: 'inherit' },
  )
  assertSuccess(cjsResult, 'consumer CJS require')

  console.log('Consumer smoke test passed.')
} finally {
  rmSync(tempRoot, { recursive: true, force: true })
}
