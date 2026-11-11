import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { after, test } from 'node:test'

import aiRules, { presets } from '../dist/index.js'

const { projects } = aiRules.configs
const tempRoot = mkdtempSync(path.join(process.cwd(), '.tmp-projects-config-'))

function writeTemp(relativePath, content) {
  const fullPath = path.join(tempRoot, relativePath)

  mkdirSync(path.dirname(fullPath), { recursive: true })
  writeFileSync(fullPath, content)
}

after(() => {
  rmSync(tempRoot, { recursive: true, force: true })
})

function projectSettings(config) {
  return config.settings['ai-rules'].project
}

function baseConfigs(configs) {
  return configs.filter((config) =>
    config.files?.some((pattern) =>
      pattern.endsWith('**/*.{js,cjs,mjs,jsx,ts,tsx}'),
    ),
  )
}

test('creates a frontend config from a preset', () => {
  const [config] = projects([
    { rootFolder: '.', preset: 'frontend' },
  ])

  assert.deepEqual(config.files, ['**/*.{js,cjs,mjs,jsx,ts,tsx}'])
  assert.equal(config.rules['ai-rules/project-structure'], 'error')
  assert.equal(config.rules['ai-rules/filename-pascal-case'], 'off')
  assert.equal(config.rules['ai-rules/no-default-export'], 'error')
  assert.deepEqual(
    config.rules['ai-rules/no-relative-parent-imports'],
    ['error', { ignore: ['^(?!\\.)'] }],
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

  const bases = baseConfigs(configs)

  assert.equal(bases.length, 2)
  assert.deepEqual(bases[0].files, [
    'apps/web/**/*.{js,cjs,mjs,jsx,ts,tsx}',
  ])
  assert.ok(bases[0].ignores.includes('apps/web/dist/**'))
  assert.equal(projectSettings(bases[0]).rootFolder, 'apps/web')
  assert.equal(projectSettings(bases[1]).rootFolder, 'apps/api')
})

test('supports nested roots and ignores child roots on the parent config', () => {
  const configs = projects([
    { rootFolder: '.', preset: 'other' },
    { rootFolder: 'apps/web', preset: 'frontend' },
    { rootFolder: 'apps/web/admin', preset: 'backend' },
  ])

  const bases = baseConfigs(configs)

  assert.equal(bases.length, 3)
  assert.ok(bases[0].ignores.includes('apps/web/**'))
  assert.ok(bases[0].ignores.includes('apps/web/admin/**'))
  assert.ok(bases[1].ignores.includes('apps/web/admin/**'))
  assert.equal(bases[2].settings['ai-rules'].project.rootFolder, 'apps/web/admin')
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
    /must be an object/,
  )

  assert.throws(
    () => projects([{ rootFolder: '.', preset: 'other', rules: [] }]),
    /must be an object/,
  )

  assert.throws(
    () => projects([{ rootFolder: '.', preset: 'other', rules: 'off' }]),
    /must be an object/,
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
  assert.ok(presets.nextjs.structure.folders.src.folders.app)
  assert.ok(presets.backend.structure.folders.src)
  assert.ok(presets.frontend.relations)
  assert.ok(presets.nextjs.relations)
  assert.ok(presets.backend.relations)
  assert.deepEqual(presets.other.structure, {})
})

test('creates a nextjs config from a preset', () => {
  const [config] = projects([
    { rootFolder: '.', preset: 'nextjs' },
  ])

  assert.equal(config.rules['ai-rules/project-structure'], 'error')
  assert.equal(projectSettings(config).preset, 'nextjs')
  assert.ok(projectSettings(config).structure.folders.src.folders.app)

  const sharedPages =
    projectSettings(config).structure.folders.src.folders.shared.folders.pages
  const pageNode = sharedPages.folders['[page]']

  assert.ok(pageNode)
  assert.equal(pageNode.name.case, 'kebab-case')
  assert.ok(pageNode.folders.components)
  assert.ok(pageNode.folders.hooks)
  assert.ok(pageNode.folders.services)
  assert.ok(pageNode.folders.contexts)
  assert.ok(pageNode.folders.helpers)

  const structure = projectSettings(config).structure

  assert.ok(structure.folders.src.folders.shared.folders.assets)
  assert.ok(structure.folders.src.files.includes('proxy.ts'))
  assert.ok(structure.folders.src.files.includes('instrumentation-client.ts'))
  assert.ok(structure.folders.src.folders.app.files.includes('global-not-found.tsx'))
  assert.ok(structure.ignoredPaths.includes('next-env.d.ts'))
  assert.ok(structure.ignoredPaths.includes('.next/**'))
  assert.ok(structure.ignoredPaths.includes('out/**'))

  const relations = projectSettings(config).relations
  const layerPaths = (name) => (
    Array.isArray(relations.layers[name])
      ? relations.layers[name]
      : [relations.layers[name]]
  )

  assert.equal(relations.layers.app, 'src/app')
  assert.ok(layerPaths('pageComponent').includes('src/shared/pages/*/components'))
  assert.ok(layerPaths('pageHook').includes('src/shared/pages/*/hooks'))
  assert.ok(layerPaths('pageService').includes('src/shared/pages/*/services'))
  assert.ok(layerPaths('pageContext').includes('src/shared/pages/*/contexts'))
  assert.ok(layerPaths('pageHelper').includes('src/shared/pages/*/helpers'))
  assert.ok(layerPaths('page').includes('src/shared/pages/*'))
})

test('presets emit file-scoped default export overrides', () => {
  const configs = projects([
    { rootFolder: 'apps/web', preset: 'nextjs' },
  ])

  const configOverride = configs.find((config) =>
    config.files?.includes('apps/web/*.config.{js,mjs,cjs,ts}'),
  )
  const nextOverride = configs.find((config) =>
    config.files?.includes('apps/web/src/app/**/page.tsx'),
  )

  assert.ok(configOverride)
  assert.ok(nextOverride)
  assert.equal(
    configOverride.rules['ai-rules/no-default-export'],
    'off',
  )
  assert.equal(
    nextOverride.rules['ai-rules/no-default-export'],
    'off',
  )
})

test('accepts project rule overrides and keeps project rules last', () => {
  const configs = projects([
    {
      rootFolder: '.',
      preset: 'other',
      overrides: [
        {
          files: ['src/**/*.ts'],
          rules: {
            'ai-rules/no-default-export': 'off',
          },
        },
      ],
      rules: {
        'ai-rules/no-default-export': 'error',
      },
    },
  ])

  const override = configs.find((config) =>
    config.files?.includes('src/**/*.ts'),
  )

  assert.ok(override)
  assert.equal(override.rules['ai-rules/no-default-export'], 'error')
})

test('configures the TypeScript resolver when tsconfig exists', () => {
  const [withTsconfig] = projects([
    { rootFolder: '.', preset: 'other' },
  ])
  const [withoutTsconfig] = projects([
    { rootFolder: 'apps/no-tsconfig', preset: 'other' },
  ])

  assert.equal(withTsconfig.settings['import-x/resolver-next'].length, 2)
  assert.equal(withoutTsconfig.settings['import-x/resolver-next'].length, 1)
})

test('validates the structure after merging preset and custom folders', () => {
  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        preset: 'frontend',
        structure: {
          folders: {
            src: {
              folders: {
                pages: {
                  folders: {
                    '[another]': {
                      name: { case: 'kebab-case' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    ]),
    /only one dynamic folder per level/,
  )
})

test('rejects unsupported structure properties', () => {
  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        structure: {
          folders: {
            src: {
              file: ['index.ts'],
            },
          },
        },
      },
    ]),
    /not a supported property/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        structure: {
          folders: {
            src: {
              files: [
                {
                  extensions: ['.ts'],
                  extension: '.ts',
                },
              ],
            },
          },
        },
      },
    ]),
    /not a supported property/,
  )
})

test('validates project rule overrides', () => {
  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        preset: 'other',
        overrides: {},
      },
    ]),
    /overrides must be an array/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        preset: 'other',
        overrides: [
          {
            files: [],
            rules: {},
          },
        ],
      },
    ]),
    /must be a non-empty array/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        preset: 'other',
        overrides: [
          {
            files: ['src/**/*.ts'],
            rules: 'off',
          },
        ],
      },
    ]),
    /must be an object/,
  )
})

test('rejects unsupported override properties and escaping paths', () => {
  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        preset: 'other',
        overrides: [
          {
            files: ['src/**/*.ts'],
            rules: {},
            file: ['src/**/*.ts'],
          },
        ],
      },
    ]),
    /not a supported property/,
  )

  for (const file of [
    '../outside.ts',
    '/absolute/file.ts',
    'C:/absolute/file.ts',
    'src/../../outside.ts',
  ]) {
    assert.throws(
      () => projects([
        {
          rootFolder: '.',
          preset: 'other',
          overrides: [
            {
              files: [file],
              rules: {},
            },
          ],
        },
      ]),
      /inside the project rootFolder/,
      file,
    )
  }
})

test('normalizes and prefixes override files', () => {
  const configs = projects([
    {
      rootFolder: 'apps/web',
      preset: 'other',
      overrides: [
        {
          files: ['./src/**/*.ts', '!src/generated/**'],
          rules: {},
        },
      ],
    },
  ])

  const override = configs.find((config) =>
    config.files?.includes('apps/web/src/**/*.ts'),
  )

  assert.ok(override)
  assert.ok(override.files.includes('!apps/web/src/generated/**'))
})

test('detects jsconfig and tsconfig variants', () => {
  writeTemp('jsconfig-project/jsconfig.json', '{}')
  writeTemp('variant-project/tsconfig.app.json', '{}')

  const roots = {
    jsconfig: path.relative(
      process.cwd(),
      path.join(tempRoot, 'jsconfig-project'),
    ).split(path.sep).join('/'),
    variant: path.relative(
      process.cwd(),
      path.join(tempRoot, 'variant-project'),
    ).split(path.sep).join('/'),
  }

  const [jsconfig] = projects([
    { rootFolder: roots.jsconfig, preset: 'other' },
  ])
  const [variant] = projects([
    { rootFolder: roots.variant, preset: 'other' },
  ])

  assert.equal(jsconfig.settings['import-x/resolver-next'].length, 2)
  assert.equal(variant.settings['import-x/resolver-next'].length, 2)
})

test('enables type-aware rules when requested', () => {
  const [config] = projects([
    { rootFolder: '.', preset: 'other', typeAware: true },
  ])

  assert.deepEqual(config.languageOptions.parserOptions, {
    projectService: true,
    tsconfigRootDir: process.cwd(),
  })
  assert.equal(config.rules['ai-rules/no-floating-promises'], 'error')
  assert.equal(config.rules['ai-rules/no-misused-promises'], 'error')
  assert.equal(config.rules['ai-rules/await-thenable'], 'error')
  assert.equal(projectSettings(config).typeAware, true)

  assert.throws(
    () => projects([
      { rootFolder: '.', preset: 'other', typeAware: 'yes' },
    ]),
    /typeAware must be a boolean/,
  )
})

test('rejects unsupported relations properties', () => {
  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        preset: 'other',
        relations: {
          layers: { controller: 'src/controllers' },
          rules: [{ from: 'controller', allow: [], allowes: [] }],
        },
      },
    ]),
    /not a supported property/,
  )

  assert.throws(
    () => projects([
      {
        rootFolder: '.',
        preset: 'other',
        relations: {
          layers: { controller: 'src/controllers' },
          rules: [{ from: 'controller', allow: [] }],
          scope: { capture: 'page', layers: [], unknown: true },
        },
      },
    ]),
    /not a supported property/,
  )
})

