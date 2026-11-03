// @ts-check
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import aiRules from './dist/index.js'

/** @type {import('./dist/index.js').IProjectStructure} */
const repositoryStructure = {
  files: [
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'tsconfig.json',
    'README.md',
    'LICENSE',
    '.gitignore',
    '*.config.{js,mjs,cjs,ts}',
  ],
  folders: {
    src: {
      files: ['index.ts', 'plugin.ts'],
      folders: {
        configs: {
          files: ['index.ts', { case: 'camelCase', extensions: ['.ts'] }],
        },
        rules: {
          files: ['index.ts', { case: 'PascalCase', extensions: ['.ts'] }],
        },
        structures: {
          files: ['index.ts', { case: 'camelCase', extensions: ['.ts'] }],
          folders: {
            presets: {
              files: ['index.ts', { case: 'camelCase', extensions: ['.ts'] }],
            },
          },
        },
        types: {
          files: [{ case: 'camelCase', extensions: ['.ts'] }],
        },
        utils: {
          files: [{ case: 'camelCase', extensions: ['.ts'] }],
        },
      },
    },
    eslint: {
      files: [{ case: 'PascalCase', extensions: ['.ts'] }],
    },
    test: {
      files: [
        {
          case: 'PascalCase',
          extensions: ['.test.mjs', '.test.ts'],
        },
      ],
    },
    '.github': { ignore: true },
    '.vscode': { ignore: true },
  },
  ignoredPaths: ['dist/**', 'node_modules/**', 'coverage/**'],
}

const projectConfigs = aiRules.configs.projects([
  {
    rootFolder: '.',
    preset: 'other',
    structure: repositoryStructure,
  },
])

/**
 * @param {import('eslint').Linter.Config} config
 * @returns {import('eslint').Linter.Config}
 */
function toStructureConfig(config) {
  return {
    ...config,
    rules: {
      'ai-rules/project-structure': config.rules?.['ai-rules/project-structure'],
    },
  }
}

/**
 * @param {import('eslint').Linter.Config} config
 * @returns {import('eslint').Linter.Config}
 */
function toTypescriptConfig(config) {
  return {
    ...config,
    files: ['**/*.{ts,tsx}'],
    rules: {
      ...(config.rules ?? {}),
      'ai-rules/project-structure': 'off',
    },
  }
}

const structureConfigs = projectConfigs.map(toStructureConfig)
const typescriptConfigs = projectConfigs.map(toTypescriptConfig)

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'coverage']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: { globals: globals.browser },
  },
  ...structureConfigs,
  ...typescriptConfigs,
  {
    files: ['**/*.d.ts'],
    rules: { '@typescript-eslint/naming-convention': 'off' },
  },
])
