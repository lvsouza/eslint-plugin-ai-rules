import type { TFileRule } from '../../types/structure'


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

export const commonIgnoredPaths = [
  'node_modules/**',
  'dist/**',
  'build/**',
  'coverage/**',
]
