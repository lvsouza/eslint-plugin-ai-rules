// @ts-check
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintPlugin from 'eslint-plugin-eslint-plugin'
import aiRules from './dist/index.js'

/** @type {import('./dist/index.js').IProjectStructure} */
const repositoryStructure = {
  files: [
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'tsconfig.json',
    'README.md',
    'CHANGELOG.md',
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
    scripts: {
      files: [{ case: 'PascalCase', extensions: ['.mjs'] }],
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
  {
    files: ['scripts/**/*.mjs'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['src/rules/**/*.ts'],
    ...eslintPlugin.configs['rules-recommended'],
    rules: {
      ...eslintPlugin.configs['rules-recommended'].rules,
      'eslint-plugin/meta-property-ordering': 'error',
      'eslint-plugin/no-incomplete-meta-schema': 'error',
      'eslint-plugin/no-incorrect-meta-schema': 'error',
      'eslint-plugin/require-meta-docs-description': ['error', { pattern: '^(Enforce|Require|Disallow)' }],
      'eslint-plugin/require-meta-docs-recommended': 'error',
      'eslint-plugin/require-meta-docs-url': 'error',
    },
  },
  ...structureConfigs,
  ...typescriptConfigs,
  {
    files: ['src/index.ts', 'eslint.config.mjs', 'tsup.config.ts'],
    rules: { 'ai-rules/no-default-export': 'off' },
  },
  {
    files: ['**/*.d.ts'],
    rules: { 'ai-rules/naming-convention': 'off' },
  },
])
