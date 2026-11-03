import assert from 'node:assert/strict'
import path from 'node:path'
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
  assert.equal(projectSettings(config).preset, 'frontend')
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

test('supports nested roots and ignores child roots on the parent config', () => {
  const configs = projects([
    { rootFolder: '.', preset: 'other' },
    { rootFolder: 'apps/web', preset: 'frontend' },
    { rootFolder: 'apps/web/admin', preset: 'backend' },
  ])

  assert.equal(configs.length, 3)
  assert.ok(configs[0].ignores.includes('apps/web/**'))
  assert.ok(configs[0].ignores.includes('apps/web/admin/**'))
  assert.ok(configs[1].ignores.includes('apps/web/admin/**'))
  assert.equal(configs[2].settings['ai-rules'].project.rootFolder, 'apps/web/admin')
})

test('normalizes rootFolder values', () => {
  const absoluteRoot = path.resolve(process.cwd(), 'apps/web')
  const cases = [
    { rootFolder: './apps/web/', expected: 'apps/web' },
    { rootFolder: ' apps/web ', expected: 'apps/web' },
    { rootFolder: absoluteRoot, expected: 'apps/web' },
    { rootFolder: './', expected: '.' },
  ]

  for (const { rootFolder, expected } of cases) {
    const [config] = projects([
      { rootFolder, preset: 'other' },
    ])

    assert.equal(projectSettings(config).rootFolder, expected)
  }
})

test('other preset does not enable structure validation', () => {
  const [config] = projects([
    { rootFolder: '.', preset: 'other' },
  ])

  assert.equal(config.rules['ai-rules/project-structure'], 'off')
  assert.equal(config.rules['ai-rules/filename-pascal-case'], 'error')
  assert.equal(projectSettings(config).preset, 'other')
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
  assert.equal(projectSettings(config).preset, undefined)
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

test('empty files replace preset files but preserve folders', () => {
  const [config] = projects([
    {
      rootFolder: '.',
      preset: 'backend',
      structure: {
        folders: {
          src: {
            files: [],
          },
        },
      },
    },
  ])

  const srcNode = projectSettings(config).structure.folders.src

  assert.deepEqual(srcNode.files, [])
  assert.ok(srcNode.folders.http)
  assert.ok(srcNode.folders['use-case'])
})

test('files and additionalFiles are applied together', () => {
  const extraRule = {
    case: 'PascalCase',
    suffix: 'Service',
    extensions: ['.ts'],
  }
  const [config] = projects([
    {
      rootFolder: '.',
      preset: 'backend',
      structure: {
        folders: {
          src: {
            files: ['index.ts'],
            additionalFiles: [extraRule],
          },
        },
      },
    },
  ])

  const srcNode = projectSettings(config).structure.folders.src

  assert.deepEqual(srcNode.files, ['index.ts', extraRule])
})

test('merges name rules from preset and custom structure', () => {
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
                    name: {
                      prefix: 'feature-',
                    },
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

  assert.deepEqual(featureNode.name, {
    case: 'kebab-case',
    prefix: 'feature-',
  })
  assert.ok(featureNode.folders['[resource]'])
})

test('ignore override disables a preset subtree', () => {
  const [config] = projects([
    {
      rootFolder: '.',
      preset: 'frontend',
      structure: {
        folders: {
          e2e: {
            ignore: true,
          },
        },
      },
    },
  ])

  const e2eNode = projectSettings(config).structure.folders.e2e

  assert.equal(e2eNode.ignore, true)
  assert.ok(e2eNode.folders.specs)
})

test('other preset with only ignoredPaths keeps structure rule off', () => {
  const [config] = projects([
    {
      rootFolder: '.',
      preset: 'other',
      structure: {
        ignoredPaths: ['tmp/**'],
      },
    },
  ])

  assert.equal(config.rules['ai-rules/project-structure'], 'off')
  assert.ok(config.ignores.includes('tmp/**'))
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
    /duplicated/,
  )

  assert.throws(
    () => projects([{ rootFolder: '../outside', preset: 'other' }]),
    /inside the current working directory/,
  )

  assert.throws(
    () => projects([null]),
    /definition must be an object/,
  )

  assert.throws(
    () => projects([{ rootFolder: 123, preset: 'other' }]),
    /rootFolder must be a non-empty string/,
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

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        structure: {
          ignoredPaths: 'tmp/**',
        },
      },
    ]),
    /ignoredPaths.*array/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        structure: {
          ignoredPaths: [''],
        },
      },
    ]),
    /non-empty string/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        structure: {
          folders: {
            src: {
              files: [{ extensions: ['ts'] }],
            },
          },
        },
      },
    ]),
    /must start with a dot/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        structure: {
          folders: {
            '[feature]': {
              name: { prefix: '' },
            },
          },
        },
      },
    ]),
    /non-empty string/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        structure: {
          folders: {
            src: null,
          },
        },
      },
    ]),
    /must be an object/,
  )
})

test('presets are exported', () => {
  assert.ok(presets.frontend.structure.folders.src)
  assert.ok(presets.backend.structure.folders.src)
  assert.deepEqual(presets.other.structure, {})
})
