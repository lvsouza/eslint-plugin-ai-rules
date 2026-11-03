import assert from 'node:assert/strict'
import { test } from 'node:test'

import aiRules, { presets } from '../dist/index.js'

const { projects } = aiRules.configs

function projectSettings(config) {
  return config.settings['ai-rules'].project
}

test('creates a frontend config from a preset', () => {
  const [config] = projects([
    { rootFolder: '.', preset: 'frontend' },
  ])

  assert.deepEqual(config.files, ['**/*.{js,cjs,mjs,jsx,ts,tsx}'])
  assert.equal(config.rules['ai-rules/project-structure'], 'error')
  assert.equal(config.rules['ai-rules/filename-pascal-case'], 'off')
  assert.ok(config.ignores.includes('src/services/generated/**'))
  assert.ok(projectSettings(config).structure.folders.src)
})

test('prefixes files and ignores for monorepo projects', () => {
  const configs = projects([
    { rootFolder: 'apps/web', preset: 'frontend' },
    { rootFolder: 'apps/api', preset: 'backend' },
  ])

  assert.equal(configs.length, 2)
  assert.deepEqual(configs[0].files, [
    'apps/web/**/*.{js,cjs,mjs,jsx,ts,tsx}',
  ])
  assert.ok(configs[0].ignores.includes('apps/web/dist/**'))
  assert.equal(projectSettings(configs[0]).rootFolder, 'apps/web')
  assert.equal(projectSettings(configs[1]).rootFolder, 'apps/api')
})

test('other preset does not enable structure validation', () => {
  const [config] = projects([
    { rootFolder: '.', preset: 'other' },
  ])

  assert.equal(config.rules['ai-rules/project-structure'], 'off')
  assert.equal(config.rules['ai-rules/filename-pascal-case'], 'error')
})

test('other preset accepts a custom structure', () => {
  const [config] = projects([
    {
      rootFolder: '.',
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

  assert.equal(config.rules['ai-rules/project-structure'], 'error')
  assert.equal(config.rules['ai-rules/filename-pascal-case'], 'off')
})

test('custom structure works without a preset', () => {
  const [config] = projects([
    {
      rootFolder: '.',
      structure: {
        files: ['index.ts'],
      },
    },
  ])

  assert.equal(config.rules['ai-rules/project-structure'], 'error')
  assert.deepEqual(projectSettings(config).structure.files, ['index.ts'])
})

test('structure overrides preset files but preserves preset folders', () => {
  const [config] = projects([
    {
      rootFolder: '.',
      preset: 'backend',
      structure: {
        folders: {
          src: {
            folders: {
              'use-case': {
                folders: {
                  '[feature]': {
                    files: [
                      {
                        case: 'PascalCase',
                        suffix: 'UseCase',
                        extensions: ['.ts'],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    },
  ])

  const useCaseNode = projectSettings(config).structure.folders.src.folders['use-case']
  const featureNode = useCaseNode.folders['[feature]']

  assert.deepEqual(useCaseNode.files, ['Errors.ts'])
  assert.equal(featureNode.name.case, 'kebab-case')
  assert.deepEqual(featureNode.files, [
    {
      case: 'PascalCase',
      suffix: 'UseCase',
      extensions: ['.ts'],
    },
  ])
  assert.ok(featureNode.folders['[resource]'])
})

test('additionalFiles appends to preset files', () => {
  const extraRule = {
    case: 'PascalCase',
    prefix: 'Use',
    extensions: ['.ts'],
  }
  const [config] = projects([
    {
      rootFolder: '.',
      preset: 'backend',
      structure: {
        folders: {
          src: {
            folders: {
              'use-case': {
                folders: {
                  '[feature]': {
                    additionalFiles: [extraRule],
                  },
                },
              },
            },
          },
        },
      },
    },
  ])

  const featureNode = projectSettings(config)
    .structure.folders.src.folders['use-case'].folders['[feature]']

  assert.equal(featureNode.files.length, 2)
  assert.deepEqual(featureNode.files[1], extraRule)
})

test('merges ignoredPaths from preset and custom structure', () => {
  const [config] = projects([
    {
      rootFolder: '.',
      preset: 'frontend',
      structure: {
        ignoredPaths: ['custom/**'],
      },
    },
  ])

  assert.ok(config.ignores.includes('custom/**'))
  assert.ok(config.ignores.includes('src/services/generated/**'))
  assert.ok(
    projectSettings(config).structure.ignoredPaths.includes('custom/**'),
  )
})

test('validates project definitions', () => {
  assert.throws(() => projects([]), /non-empty array/)

  assert.throws(
    () => projects([{ rootFolder: '', preset: 'frontend' }]),
    /rootFolder must be a non-empty string/,
  )

  assert.throws(
    () => projects([{ rootFolder: '.', preset: 'desktop' }]),
    /preset must be one of/,
  )

  assert.throws(
    () => projects([
      { rootFolder: 'app', preset: 'frontend' },
      { rootFolder: 'app', preset: 'backend' },
    ]),
    /overlaps/,
  )

  assert.throws(
    () => projects([
      { rootFolder: '.', preset: 'frontend' },
      { rootFolder: 'apps/web', preset: 'frontend' },
    ]),
    /overlaps/,
  )

  assert.throws(
    () => projects([{ rootFolder: '../outside', preset: 'other' }]),
    /inside the current working directory/,
  )
})

test('validates structure declarations', () => {
  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        structure: {
          folders: {
            '[first]': {},
            '[second]': {},
          },
        },
      },
    ]),
    /only one dynamic folder per level/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        structure: {
          folders: {
            '[feature]': {
              name: { case: 'lowercase' },
            },
          },
        },
      },
    ]),
    /case/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        structure: {
          folders: {
            src: {
              files: [{ case: 'PascalCase' }],
            },
          },
        },
      },
    ]),
    /extensions/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        structure: {
          folders: {
            src: {
              files: [{ extensions: ['.ts'], pattern: '[' }],
            },
          },
        },
      },
    ]),
    /regular expression/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        structure: {
          folders: {
            src: {
              name: { case: 'kebab-case' },
            },
          },
        },
      },
    ]),
    /only allowed for dynamic folders/,
  )
})

test('presets are exported', () => {
  assert.ok(presets.frontend.structure.folders.src)
  assert.ok(presets.backend.structure.folders.src)
  assert.deepEqual(presets.other.structure, {})
})
