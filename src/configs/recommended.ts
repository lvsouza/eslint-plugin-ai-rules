import { createNodeResolver, importX } from 'eslint-plugin-import-x'
import stylistic from '@stylistic/eslint-plugin'
import tseslint from 'typescript-eslint'
import type { Linter } from 'eslint'

import { RULE_IDS } from '@/rules/constants'
import { plugin } from '@/plugin'


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
      [RULE_IDS.sortImports]: 'error',
      [RULE_IDS.noMultilineImports]: 'error',
      [RULE_IDS.filenamePascalCase]: 'error',
      [RULE_IDS.projectSetup]: 'warn',
      'max-len': 'off',
      'import-x/no-duplicates': 'error',
      'import-x/no-default-export': 'error',
      'import-x/no-relative-parent-imports': 'error',
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
