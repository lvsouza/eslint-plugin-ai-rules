export const RULE_NAMES = {
  filenamePascalCase: 'filename-pascal-case',
  noMultilineImports: 'no-multiline-imports',
  projectSetup: 'project-setup',
  projectStructure: 'project-structure',
  sortImports: 'sort-imports',
} as const

export const RULE_IDS = {
  filenamePascalCase: `ai-rules/${RULE_NAMES.filenamePascalCase}`,
  noMultilineImports: `ai-rules/${RULE_NAMES.noMultilineImports}`,
  projectSetup: `ai-rules/${RULE_NAMES.projectSetup}`,
  projectStructure: `ai-rules/${RULE_NAMES.projectStructure}`,
  sortImports: `ai-rules/${RULE_NAMES.sortImports}`,
} as const

export const BUNDLED_RULE_NAMES = {
  noDuplicates: 'no-duplicates',
  noDefaultExport: 'no-default-export',
  noRelativeParentImports: 'no-relative-parent-imports',
  noExplicitAny: 'no-explicit-any',
  noNonNullAssertion: 'no-non-null-assertion',
  noSelfImport: 'no-self-import',
  noUnresolved: 'no-unresolved',
  semi: 'semi',
  consistentTypeImports: 'consistent-type-imports',
  noUnusedVars: 'no-unused-vars',
  namingConvention: 'naming-convention',
  dependencies: 'dependencies',
} as const

export const BUNDLED_RULE_IDS = {
  noDuplicates: `ai-rules/${BUNDLED_RULE_NAMES.noDuplicates}`,
  noDefaultExport: `ai-rules/${BUNDLED_RULE_NAMES.noDefaultExport}`,
  noRelativeParentImports: `ai-rules/${BUNDLED_RULE_NAMES.noRelativeParentImports}`,
  noExplicitAny: `ai-rules/${BUNDLED_RULE_NAMES.noExplicitAny}`,
  noNonNullAssertion: `ai-rules/${BUNDLED_RULE_NAMES.noNonNullAssertion}`,
  noSelfImport: `ai-rules/${BUNDLED_RULE_NAMES.noSelfImport}`,
  noUnresolved: `ai-rules/${BUNDLED_RULE_NAMES.noUnresolved}`,
  semi: `ai-rules/${BUNDLED_RULE_NAMES.semi}`,
  consistentTypeImports: `ai-rules/${BUNDLED_RULE_NAMES.consistentTypeImports}`,
  noUnusedVars: `ai-rules/${BUNDLED_RULE_NAMES.noUnusedVars}`,
  namingConvention: `ai-rules/${BUNDLED_RULE_NAMES.namingConvention}`,
  dependencies: `ai-rules/${BUNDLED_RULE_NAMES.dependencies}`,
} as const

export type TRuleName = (typeof RULE_NAMES)[keyof typeof RULE_NAMES]
export type TRuleId = (typeof RULE_IDS)[keyof typeof RULE_IDS]
export type TBundledRuleName =
  (typeof BUNDLED_RULE_NAMES)[keyof typeof BUNDLED_RULE_NAMES]
export type TBundledRuleId =
  (typeof BUNDLED_RULE_IDS)[keyof typeof BUNDLED_RULE_IDS]
