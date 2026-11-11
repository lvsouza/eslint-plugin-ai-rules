import type { IProjectRulesOverride, TFileRule } from '@/types/structure'
import { BUNDLED_RULE_IDS } from '@/rules/constants'


export const pascalTs: TFileRule = {
  case: 'PascalCase',
  extensions: ['.ts'],
}

export const pascalTsx: TFileRule = {
  case: 'PascalCase',
  extensions: ['.tsx'],
}

export const pascalTsOrTsx: TFileRule = {
  case: 'PascalCase',
  extensions: ['.ts', '.tsx'],
}

export const configFileDefaultExportOverride: IProjectRulesOverride = {
  files: ['*.config.{js,mjs,cjs,ts}'],
  rules: {
    [BUNDLED_RULE_IDS.noDefaultExport]: 'off',
  },
}

export const commonIgnoredPaths = [
  'node_modules/**',
  'dist/**',
  'build/**',
  'coverage/**',
]
