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

export type TRuleName = (typeof RULE_NAMES)[keyof typeof RULE_NAMES]
export type TRuleId = (typeof RULE_IDS)[keyof typeof RULE_IDS]
