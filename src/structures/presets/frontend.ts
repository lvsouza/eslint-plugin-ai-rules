import { commonIgnoredPaths, pascalTs, pascalTsOrTsx, pascalTsx } from './helpers'
import type { IProjectPreset, IRelationsConfig } from '../../types/structure'


const frontendRelations: IRelationsConfig = {
  layers: {
    pageComponent: ['src/pages/*/components', 'src/pages/*/tabs'],
    pageHook: 'src/pages/*/hooks',
    pageService: 'src/pages/*/services',
    pageContext: 'src/pages/*/contexts',
    pageHelper: 'src/pages/*/helpers',
    page: 'src/pages/*',
    components: 'src/shared/components',
    hooks: 'src/shared/hooks',
    contexts: 'src/shared/contexts',
    generated: 'src/shared/services/generated',
    services: 'src/shared/services',
    utils: 'src/shared/utils',
    helpers: 'src/shared/helpers',
    constants: 'src/shared/constants',
    env: 'src/shared/env',
  },
  scope: {
    capture: 'page',
    layers: [
      'pageComponent',
      'pageHook',
      'pageService',
      'pageContext',
      'pageHelper',
      'page',
    ],
  },
  rules: [
    {
      from: 'components',
      allow: [
        'hooks',
        'contexts',
        'services',
        'generated',
        'utils',
        'helpers',
        'constants',
        'env',
      ],
      allowSameLayer: true,
    },
    {
      from: 'hooks',
      allow: [
        'contexts',
        'services',
        'generated',
        'utils',
        'helpers',
        'constants',
        'env',
      ],
      allowSameLayer: true,
    },
    {
      from: 'contexts',
      allow: [
        'services',
        'generated',
        'utils',
        'helpers',
        'constants',
        'env',
      ],
      allowSameLayer: false,
    },
    {
      from: 'services',
      allow: ['generated', 'utils', 'helpers', 'constants', 'env'],
      allowSameLayer: false,
    },
    {
      from: 'generated',
      allow: [],
      allowSameLayer: true,
    },
    {
      from: 'utils',
      allow: ['helpers', 'constants', 'env'],
      allowSameLayer: false,
    },
    {
      from: 'helpers',
      allow: ['utils', 'constants', 'env'],
      allowSameLayer: false,
    },
    {
      from: 'constants',
      allow: [],
      allowSameLayer: false,
    },
    {
      from: 'env',
      allow: [],
      allowSameLayer: false,
    },
    {
      from: 'page',
      allow: [
        'components',
        'hooks',
        'contexts',
        'services',
        'generated',
        'utils',
        'helpers',
        'constants',
        'env',
        'pageComponent',
        'pageHook',
        'pageService',
        'pageContext',
        'pageHelper',
      ],
      allowSameLayer: true,
    },
    {
      from: 'pageComponent',
      allow: [
        'components',
        'hooks',
        'contexts',
        'services',
        'generated',
        'utils',
        'helpers',
        'constants',
        'env',
        'page',
        'pageHook',
        'pageService',
        'pageContext',
        'pageHelper',
      ],
      allowSameLayer: true,
    },
    {
      from: 'pageHook',
      allow: [
        'hooks',
        'contexts',
        'services',
        'generated',
        'utils',
        'helpers',
        'constants',
        'env',
        'pageService',
        'pageContext',
        'pageHelper',
      ],
      allowSameLayer: true,
    },
    {
      from: 'pageService',
      allow: [
        'services',
        'generated',
        'utils',
        'helpers',
        'constants',
        'env',
        'pageHelper',
      ],
      allowSameLayer: false,
    },
    {
      from: 'pageContext',
      allow: [
        'contexts',
        'services',
        'generated',
        'utils',
        'helpers',
        'constants',
        'env',
        'pageService',
        'pageHelper',
      ],
      allowSameLayer: false,
    },
    {
      from: 'pageHelper',
      allow: ['helpers', 'utils', 'constants', 'env'],
      allowSameLayer: false,
    },
  ],
}


export const frontendPreset: IProjectPreset = {
  structure: {
    files: [
      'package.json',
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'bun.lockb',
      '*.config.{js,mjs,cjs,ts}',
      'tsconfig*.json',
      '*.tsbuildinfo',
      '.env',
      '.env.*',
      '.gitignore',
      '.dockerignore',
      '.editorconfig',
      'Dockerfile',
      'entrypoint.sh',
      'nginx.conf',
      'index.html',
      'AGENTS.md',
      'README.md',
      'LICENSE',
    ],
    folders: {
      src: {
        files: [
          'App.tsx',
          'AppRoutes.tsx',
          'main.tsx',
          'index.css',
          'vite-env.d.ts',
        ],
        folders: {
          shared: {
            folders: {
              components: {
                files: [pascalTsx],
                folders: {
                  ui: {
                    files: [pascalTsOrTsx],
                  },
                },
              },
              constants: {
                files: [pascalTs],
              },
              contexts: {
                files: [
                  {
                    case: 'PascalCase',
                    extensions: ['.tsx'],
                  },
                ],
              },
              env: {
                files: ['index.ts'],
              },
              helpers: {
                files: [pascalTs],
              },
              hooks: {
                files: [pascalTs],
              },
              services: {
                folders: {
                  generated: { ignore: true },
                  utils: {
                    files: [pascalTs],
                  },
                },
              },
              utils: {
                files: [pascalTs],
              },
            },
          },
          pages: {
            files: [pascalTsx],
            folders: {
              '[feature]': {
                name: { case: 'kebab-case' },
                files: [pascalTsx, 'helpers.ts', 'schema.ts', 'types.ts'],
                folders: {
                  components: {
                    files: [pascalTsx],
                  },
                  hooks: {
                    files: [pascalTs],
                  },
                  services: {
                    files: [pascalTs],
                  },
                  contexts: {
                    files: [
                      {
                        case: 'PascalCase',
                        extensions: ['.tsx'],
                      },
                    ],
                  },
                  helpers: {
                    files: [pascalTs],
                  },
                  tabs: {
                    folders: {
                      '[tab]': {
                        name: { case: 'kebab-case' },
                        files: [pascalTsx],
                        folders: {
                          '[section]': {
                            name: { case: 'kebab-case' },
                            files: [
                              pascalTs,
                              pascalTsx,
                              'collisionDetection.ts',
                              'contextualFilters.ts',
                            ],
                            folders: {
                              components: {
                                files: [pascalTsx],
                              },
                              contents: {
                                files: [pascalTsx],
                                folders: {
                                  components: {
                                    files: [pascalTsx],
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      e2e: {
        files: ['.env.e2e', '.env.e2e.example'],
        folders: {
          '.auth': { ignore: true },
          fixtures: {
            files: ['*.png', '*.jpg', '*.jpeg', '*.svg', '*.webp'],
          },
          pages: {
            files: [pascalTs],
          },
          specs: {
            files: ['*.spec.ts'],
          },
          support: {
            files: [pascalTs],
            folders: {
              api: {
                files: [pascalTs],
              },
            },
          },
        },
      },
      scripts: {
        files: [pascalTs],
      },
      public: { ignore: true },
      '.github': { ignore: true },
      '.vscode': { ignore: true },
    },
    ignoredPaths: [
      ...commonIgnoredPaths,
      'playwright-report/**',
      'test-results/**',
      'src/shared/services/generated/**',
      'scripts/types/**',
    ],
  },
  relations: frontendRelations,
}
