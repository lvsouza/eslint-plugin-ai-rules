import { commonIgnoredPaths, pascalTs, pascalTsOrTsx, pascalTsx } from './helpers'
import type { IProjectPreset } from '../../types/structure'


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
          hooks: {
            files: [pascalTs],
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
      'src/services/generated/**',
      'scripts/types/**',
    ],
  },
}
