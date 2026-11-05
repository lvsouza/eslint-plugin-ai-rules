import type { IProjectPreset, IRelationsConfig } from '@/types/structure'
import { commonIgnoredPaths, pascalTs } from './helpers'


const backendRelations: IRelationsConfig = {
  layers: {
    controller: 'src/http/controllers',
    http: 'src/http/hooks',
    useCase: 'src/use-case',
    repository: 'src/repositories',
    generated: 'src/services/generated',
    serviceModule: 'src/services/*',
    service: 'src/services',
    databaseSchema: 'src/database/schema',
    database: 'src/database',
    helper: 'src/helpers',
    env: 'src/env',
    types: ['src/@types', 'src/http/types'],
  },
  scope: {
    capture: 'service',
    layers: ['serviceModule'],
  },
  rules: [
    {
      from: 'controller',
      allow: ['useCase', 'http', 'generated', 'helper', 'env'],
      allowSameLayer: false,
    },
    {
      from: 'http',
      allow: ['useCase', 'helper', 'generated'],
      allowSameLayer: false,
    },
    {
      from: 'useCase',
      allow: ['repository', 'service', 'serviceModule', 'generated'],
      allowSameLayer: true,
    },
    {
      from: 'repository',
      allow: ['database', 'databaseSchema'],
      allowSameLayer: false,
    },
    {
      from: 'service',
      allow: ['generated', 'env'],
      allowSameLayer: false,
    },
    {
      from: 'generated',
      allow: [],
      allowSameLayer: true,
    },
    {
      from: 'serviceModule',
      allow: ['generated', 'env'],
      allowSameLayer: true,
    },
    {
      from: 'database',
      allow: ['databaseSchema', 'env'],
      allowSameLayer: false,
    },
    {
      from: 'databaseSchema',
      allow: [],
      allowSameLayer: true,
    },
    {
      from: 'helper',
      allow: [],
      allowSameLayer: false,
    },
    {
      from: 'env',
      allow: [],
      allowSameLayer: false,
    },
    {
      from: 'types',
      allow: [],
      allowSameLayer: false,
    },
  ],
}


export const backendPreset: IProjectPreset = {
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
      'AGENTS.md',
      'README.md',
      'LICENSE',
    ],
    folders: {
      src: {
        files: ['index.ts', 'Server.ts', 'Schemas.ts'],
        folders: {
          database: {
            files: ['Connection.ts'],
            folders: {
              schema: {
                files: ['index.ts', pascalTs],
              },
              seeds: {
                files: ['index.ts'],
              },
              migrations: { ignore: true },
            },
          },
          repositories: {
            files: ['Setup.ts', pascalTs],
          },
          env: {
            files: ['index.ts'],
          },
          helpers: {
            files: [pascalTs],
          },
          '@types': {
            files: ['*.d.ts'],
          },
          http: {
            files: ['Routes.ts'],
            folders: {
              controllers: {
                files: ['Health.ts'],
                folders: {
                  '[feature]': {
                    name: { case: 'kebab-case' },
                    files: [pascalTs],
                    folders: {
                      '[resource]': {
                        name: { case: 'kebab-case' },
                        files: [pascalTs],
                      },
                    },
                  },
                },
              },
              hooks: {
                files: [pascalTs],
              },
              types: {
                files: ['*.d.ts'],
              },
            },
          },
          services: {
            files: [pascalTs],
            folders: {
              generated: { ignore: true },
              '[service]': {
                name: { case: 'kebab-case' },
                files: ['index.ts', pascalTs],
              },
            },
          },
          'use-case': {
            files: ['Errors.ts'],
            folders: {
              '[feature]': {
                name: { case: 'kebab-case' },
                files: [pascalTs],
                folders: {
                  '[resource]': {
                    name: { case: 'kebab-case' },
                    files: [pascalTs],
                  },
                },
              },
            },
          },
        },
      },
      docs: { ignore: true },
      scripts: {
        files: [pascalTs],
      },
      test: {
        files: [
          { case: 'PascalCase', extensions: ['.test.ts'] },
          'GlobalSetup.ts',
          'Setup.ts',
          '*.d.ts',
        ],
        folders: {
          Helpers: {
            files: [pascalTs],
          },
        },
      },
      '.github': { ignore: true },
      '.vscode': { ignore: true },
    },
    ignoredPaths: [
      ...commonIgnoredPaths,
      'uploads/**',
      'src/services/generated/**',
    ],
  },
  relations: backendRelations,
}
