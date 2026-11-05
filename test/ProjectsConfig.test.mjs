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
  assert.equal(config.rules['ai-rules/no-default-export'], 'error')
  assert.equal(
    config.rules['ai-rules/no-relative-parent-imports'],
    'error',
  )
  assert.ok(config.ignores.includes('src/shared/services/generated/**'))
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

test('builds boundaries config from relations', () => {
  const [config] = projects([
    {
      rootFolder: '.',
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

  assert.ok(config.plugins['ai-rules'])
  assert.equal(config.plugins.boundaries, undefined)
  assert.equal(config.settings['boundaries/root-path'], process.cwd())
  assert.deepEqual(config.settings['boundaries/elements'], [
    {
      type: 'controller',
      pattern: ['src/http/controllers'],
      partialMatch: false,
    },
    {
      type: 'repository',
      pattern: ['src/repositories'],
      partialMatch: false,
    },
  ])
  assert.equal(config.rules['ai-rules/dependencies'][0], 'error')
  assert.ok(config.settings['import/resolver'])
  assert.equal(
    projectSettings(config).relations.layers.controller,
    'src/http/controllers',
  )
})

test('combines preset structure with relations', () => {
  const [config] = projects([
    {
      rootFolder: '.',
      preset: 'backend',
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

  assert.equal(config.rules['ai-rules/project-structure'], 'error')
  assert.equal(config.rules['ai-rules/dependencies'][0], 'error')
  assert.ok(config.plugins['ai-rules'])
  assert.equal(config.plugins.boundaries, undefined)
  assert.ok(projectSettings(config).structure.folders.src)
  assert.ok(projectSettings(config).relations)
})

test('merges preset relations with custom overrides', () => {
  const [config] = projects([
    {
      rootFolder: '.',
      preset: 'backend',
      relations: {
        layers: {
          controller: 'src/custom-controllers',
        },
        rules: [
          {
            from: 'controller',
            allow: ['useCase'],
            allowSameLayer: false,
          },
        ],
      },
    },
  ])

  const relations = projectSettings(config).relations

  assert.equal(relations.layers.controller, 'src/custom-controllers')
  assert.ok(relations.layers.repository)

  const controllerRule = relations.rules.find(
    (rule) => rule.from === 'controller',
  )

  assert.deepEqual(controllerRule.allow, ['useCase'])
  assert.equal(controllerRule.allowSameLayer, false)
  assert.ok(relations.rules.some((rule) => rule.from === 'useCase'))
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

test('project rules override recommended and structural defaults', () => {
  const [config] = projects([
    {
      rootFolder: '.',
      preset: 'frontend',
      rules: {
        'ai-rules/sort-imports': 'off',
        'ai-rules/project-structure': 'warn',
        'ai-rules/filename-pascal-case': 'error',
        'ai-rules/no-default-export': 'off',
        'ai-rules/no-relative-parent-imports': 'off',
        'ai-rules/semi': ['warn', 'always'],
      },
    },
  ])

  assert.equal(config.rules['ai-rules/sort-imports'], 'off')
  assert.equal(config.rules['ai-rules/project-structure'], 'warn')
  assert.equal(config.rules['ai-rules/filename-pascal-case'], 'error')
  assert.equal(config.rules['ai-rules/no-default-export'], 'off')
  assert.equal(config.rules['ai-rules/no-relative-parent-imports'], 'off')
  assert.deepEqual(config.rules['ai-rules/semi'], ['warn', 'always'])
})

test('project rules override boundaries defaults', () => {
  const [config] = projects([
    {
      rootFolder: '.',
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
      rules: {
        'ai-rules/dependencies': 'off',
      },
    },
  ])

  assert.equal(config.rules['ai-rules/dependencies'], 'off')
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
  assert.ok(config.ignores.includes('src/shared/services/generated/**'))
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

  assert.throws(
    () => projects([{ rootFolder: '.', preset: 'other', rules: null }]),
    /rules must be an object/,
  )

  assert.throws(
    () => projects([{ rootFolder: '.', preset: 'other', rules: [] }]),
    /rules must be an object/,
  )

  assert.throws(
    () => projects([{ rootFolder: '.', preset: 'other', rules: 'off' }]),
    /rules must be an object/,
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

test('validates relations declarations', () => {
  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        relations: {
          layers: {},
          rules: [],
        },
      },
    ]),
    /layers.*cannot be empty/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        relations: {
          layers: {
            controller: 'src/controllers',
          },
          rules: [
            {
              from: 'controller',
              allow: ['repository'],
            },
          ],
        },
      },
    ]),
    /unknown layer "repository"/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        relations: {
          layers: {
            controller: 'src/controllers',
            repository: 'src/repositories',
          },
          rules: [
            {
              from: 'controller',
              allow: ['repository'],
              deny: ['repository'],
            },
          ],
        },
      },
    ]),
    /exactly one of "allow" or "deny"/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        relations: {
          layers: {
            controller: 'src/controllers',
            repository: 'src/repositories',
          },
          rules: [
            { from: 'controller', deny: ['repository'] },
            { from: 'controller', deny: ['repository'] },
          ],
        },
      },
    ]),
    /duplicate rule/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        relations: {
          layers: {
            controller: [],
          },
          rules: [],
        },
      },
    ]),
    /at least one path/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        relations: {
          layers: 'src',
          rules: [],
        },
      },
    ]),
    /layers.*must be an object/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        relations: {
          layers: {
            controller: 'src/controllers',
          },
          rules: 'nope',
        },
      },
    ]),
    /rules.*must be an array/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        relations: {
          layers: {
            controller: 'src/controllers',
          },
          rules: [null],
        },
      },
    ]),
    /must be an object/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        relations: {
          layers: {
            controller: 'src/controllers',
          },
          rules: [
            { from: '', deny: [] },
          ],
        },
      },
    ]),
    /from.*non-empty string/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        relations: {
          layers: {
            controller: 'src/controllers',
            repository: 'src/repositories',
          },
          rules: [
            { from: 'controller', allow: 'repository' },
          ],
        },
      },
    ]),
    /allow.*must be an array/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        relations: {
          allowTypeImports: 'yes',
          layers: {
            controller: 'src/controllers',
          },
          rules: [],
        },
      },
    ]),
    /allowTypeImports.*boolean/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        relations: {
          layers: {
            controller: 'src/controllers',
            repository: 'src/repositories',
          },
          rules: [
            {
              from: 'controller',
              deny: ['repository'],
              allowTypeImports: 'yes',
            },
          ],
        },
      },
    ]),
    /allowTypeImports.*boolean/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        relations: {
          layers: {
            controller: 'src/controllers',
            repository: 'src/repositories',
          },
          rules: [
            {
              from: 'controller',
              deny: ['repository'],
              message: '',
            },
          ],
        },
      },
    ]),
    /message.*non-empty string/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        relations: {
          layers: {
            controller: 'src/controllers',
            repository: 'src/repositories',
          },
          rules: [
            {
              from: 'controller',
              deny: ['missing'],
            },
          ],
        },
      },
    ]),
    /unknown layer "missing"/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        relations: {
          layers: {
            controller: 'src/controllers',
          },
          rules: [
            {
              from: 'controller',
              allow: [],
              allowSameLayer: 'yes',
            },
          ],
        },
      },
    ]),
    /allowSameLayer.*boolean/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        relations: {
          layers: {
            controller: 'src/controllers',
          },
          rules: [
            {
              from: 'controller',
              allow: ['controller'],
            },
          ],
        },
      },
    ]),
    /cannot reference its own layer/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        relations: {
          layers: {
            page: 'src/pages',
          },
          scope: {
            capture: 'page',
            layers: ['page'],
          },
          rules: [],
        },
      },
    ]),
    /wildcard/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        relations: {
          layers: {
            page: 'src/pages/*',
          },
          scope: {
            capture: 'page',
            layers: ['page'],
          },
          rules: [
            {
              from: 'pageComponent',
              allow: ['page'],
            },
          ],
        },
      },
    ]),
    /unknown layer "pageComponent"/,
  )
})

test('presets are exported', () => {
  assert.ok(presets.frontend.structure.folders.src)
  assert.ok(presets.backend.structure.folders.src)
  assert.ok(presets.frontend.relations)
  assert.ok(presets.backend.relations)
  assert.deepEqual(presets.other.structure, {})
})
