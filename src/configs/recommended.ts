import type { Linter } from 'eslint'

import { buildImportResolvers } from '@/utils/buildImportResolvers'
import { BUNDLED_RULE_IDS, RULE_IDS } from '@/rules/constants'
import { plugin } from '@/plugin'


const UNRESOLVED_IGNORE = [
  '\\.(css|scss|sass|less|styl|svg|png|jpe?g|gif|webp|avif|ico|woff2?|ttf|otf|mp4|webm|mp3|wav|pdf)(\\?.*)?$',
  '\\?(raw|url|inline|worker|sharedworker)$',
]

export const recommended: Linter.Config[] = [
  {
    plugins: {
      'ai-rules': plugin,
    },
    settings: {
      'import-x/resolver-next': buildImportResolvers(),
    },
    rules: {
      [RULE_IDS.sortImports]: 'error',
      [RULE_IDS.noMultilineImports]: 'error',
      [RULE_IDS.filenamePascalCase]: 'error',
      [RULE_IDS.projectSetup]: 'warn',
      'max-len': 'off',
      'no-debugger': 'error',
      [BUNDLED_RULE_IDS.noDuplicates]: 'error',
      [BUNDLED_RULE_IDS.noDefaultExport]: 'error',
      [BUNDLED_RULE_IDS.noRelativeParentImports]: [
        'error',
        { ignore: ['^(?!\\.)'] },
      ],
      [BUNDLED_RULE_IDS.noExplicitAny]: 'error',
      [BUNDLED_RULE_IDS.noNonNullAssertion]: 'error',
      [BUNDLED_RULE_IDS.noSelfImport]: 'error',
      [BUNDLED_RULE_IDS.noUnresolved]: [
        'error',
        { ignore: UNRESOLVED_IGNORE },
      ],
      [BUNDLED_RULE_IDS.noUselessPathSegments]: 'error',
      [BUNDLED_RULE_IDS.noExtraneousDependencies]: [
        'warn',
        {
          devDependencies: true,
          optionalDependencies: true,
          peerDependencies: true,
        },
      ],
      [BUNDLED_RULE_IDS.noCycle]: [
        'warn',
        { maxDepth: 5, ignoreExternal: true },
      ],
      'no-console': [
        'warn',
        { allow: ['info', 'warn', 'error'] },
      ],
      [BUNDLED_RULE_IDS.semi]: ['error', 'never'],
      [BUNDLED_RULE_IDS.consistentTypeImports]: [
        'error',
        { prefer: 'type-imports' },
      ],
      [BUNDLED_RULE_IDS.noUnusedVars]: [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      [BUNDLED_RULE_IDS.namingConvention]: [
        'error',
        { selector: 'interface', format: ['PascalCase'], prefix: ['I'] },
        { selector: 'typeAlias', format: ['PascalCase'], prefix: ['T'] },
      ],
    },
  },
]
