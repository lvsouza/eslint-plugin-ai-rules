import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')

function fail(message) {
  console.error(`✗ ${message}`)
  process.exit(1)
}

function assertFile(relativePath, label) {
  const fullPath = resolve(projectRoot, relativePath)

  if (!existsSync(fullPath)) {
    fail(`missing ${label}: ${relativePath}`)
  }

  if (statSync(fullPath).size === 0) {
    fail(`empty ${label}: ${relativePath}`)
  }
}

const manifest = JSON.parse(
  readFileSync(resolve(projectRoot, 'package.json'), 'utf8'),
)

for (const field of ['main', 'module', 'types']) {
  assertFile(manifest[field], `package.json "${field}"`)
}

for (const [entry, target] of Object.entries(manifest.exports)) {
  if (typeof target === 'string') {
    assertFile(target, `exports["${entry}"]`)
    continue
  }

  for (const [condition, conditionTarget] of Object.entries(target)) {
    if (typeof conditionTarget === 'string') {
      assertFile(conditionTarget, `exports["${entry}"].${condition}`)
      continue
    }

    for (const [nestedCondition, nestedTarget] of Object.entries(
      conditionTarget,
    )) {
      assertFile(
        nestedTarget,
        `exports["${entry}"].${condition}.${nestedCondition}`,
      )
    }
  }
}

console.log('✓ build artifacts OK')
