import type { IProjectRulesOverride, IStructureNode, TFileRule } from '@/types/structure'
import { BUNDLED_RULE_IDS } from '@/rules/constants'


const COMPONENT_GROUP_LEVELS = 10

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

export function componentGroupNode(
  levels: number = COMPONENT_GROUP_LEVELS,
): IStructureNode {
  const node: IStructureNode = {
    name: { case: 'kebab-case' },
    files: [pascalTsx],
  }

  if (levels > 1) {
    node.folders = {
      '[component-group]': componentGroupNode(levels - 1),
    }
  }

  return node
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
