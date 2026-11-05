import { filenamePascalCase } from './rules/FilenamePascalCase'
import { noMultilineImports } from './rules/NoMultilineImports'
import { projectStructure } from './rules/ProjectStructure'
import { projectSetup } from './rules/ProjectSetup'
import { sortImports } from './rules/SortImports'
import { bundledRules } from './rules/bundled'
import { RULE_NAMES } from './rules/constants'


declare const __AI_RULES_VERSION__: string


export const plugin = {
  meta: {
    name: 'eslint-plugin-ai-rules',
    version: __AI_RULES_VERSION__,
  },
  rules: {
    ...bundledRules,
    [RULE_NAMES.filenamePascalCase]: filenamePascalCase,
    [RULE_NAMES.noMultilineImports]: noMultilineImports,
    [RULE_NAMES.projectSetup]: projectSetup,
    [RULE_NAMES.projectStructure]: projectStructure,
    [RULE_NAMES.sortImports]: sortImports,
  },
} as const
