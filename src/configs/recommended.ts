import { createNodeResolver, importX } from 'eslint-plugin-import-x'
import stylistic from '@stylistic/eslint-plugin'
import tseslint from 'typescript-eslint'
import type { Linter } from 'eslint'

import { plugin } from '../plugin'


export const recommended: Linter.Config[] = [
  {
    plugins: {
      '@stylistic': stylistic,
      'import-x': importX,
      'ai-rules': plugin,
      '@typescript-eslint': tseslint.plugin,
    },
    settings: {
      'import-x/resolver-next': [
        createNodeResolver({
          extensions: ['.ts', '.tsx', '.d.ts', '.js', '.jsx'],
        }),
      ],
    },
    rules: {
      'ai-rules/sort-imports': 'error',
      'ai-rules/no-multiline-imports': 'error',
      'ai-rules/filename-pascal-case': 'error',
      'ai-rules/project-setup': 'warn',
      'max-len': 'off',
      'import-x/no-duplicates': 'error',
      'import-x/no-default-export': 'off',
      '@stylistic/semi': ['error', 'never'],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/naming-convention': [
        'error',
        { selector: 'interface', format: ['PascalCase'], prefix: ['I'] },
        { selector: 'typeAlias', format: ['PascalCase'], prefix: ['T'] },
      ],
    },
  },
]

export default recommended
