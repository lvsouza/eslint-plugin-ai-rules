import type { IProjectPreset } from '../../types/structure'
import { commonIgnoredPaths, pascalTs } from './helpers'


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
      '.github': { ignore: true },
      '.vscode': { ignore: true },
    },
    ignoredPaths: [
      ...commonIgnoredPaths,
      'src/services/generated/**',
    ],
  },
}
