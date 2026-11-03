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

function run(command, args, options) {
  return spawnSync(command, args, {
    encoding: 'utf8',
    ...options,
  })
}

function assertSuccess(result, label) {
  if (result.status !== 0) {
    throw new Error(
      `${label} failed.\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    )
  }
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

  writeFileSync(
    path.join(consumerDir, 'package.json'),
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
      'eslint@^9.0.0',
      'typescript@>=5.0.0',
      'typescript-eslint@^8.0.0',
    ],
    {
      cwd: consumerDir,
      stdio: 'inherit',
    },
  )
  assertSuccess(installResult, 'consumer install')

  const config = `import aiRules from 'eslint-plugin-ai-rules'
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

  writeFileSync(path.join(consumerDir, 'eslint.config.mjs'), config)
  mkdirSync(path.join(consumerDir, 'src'), { recursive: true })
  writeFileSync(
    path.join(consumerDir, 'src', 'index.ts'),
    'export const value = 1\n',
  )

  const validResult = run(
    npxCommand,
    ['--no-install', 'eslint', 'src/index.ts'],
    { cwd: consumerDir },
  )
  assertSuccess(validResult, 'consumer eslint valid file')

  mkdirSync(path.join(consumerDir, 'src', 'invalid'), { recursive: true })
  writeFileSync(
    path.join(consumerDir, 'src', 'invalid', 'Bad.ts'),
    'export const bad = 1\n',
  )

  const invalidResult = run(
    npxCommand,
    ['--no-install', 'eslint', 'src/invalid/Bad.ts'],
    { cwd: consumerDir },
  )
  const invalidOutput = `${invalidResult.stdout}\n${invalidResult.stderr}`

  if (
    invalidResult.status === 0 ||
    !invalidOutput.includes('ai-rules/project-structure')
  ) {
    throw new Error(
      `consumer eslint did not report the structure violation.\nstdout:\n${invalidResult.stdout}\nstderr:\n${invalidResult.stderr}`,
    )
  }

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
