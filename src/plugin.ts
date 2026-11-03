import { filenamePascalCase } from './rules/FilenamePascalCase'
import { noMultilineImports } from './rules/NoMultilineImports'
import { projectStructure } from './rules/ProjectStructure'
import { projectSetup } from './rules/ProjectSetup'
import { sortImports } from './rules/SortImports'


declare const __AI_RULES_VERSION__: string


export const plugin = {
  meta: {
    name: 'eslint-plugin-ai-rules',
    version: __AI_RULES_VERSION__,
  },
  rules: {
    'filename-pascal-case': filenamePascalCase,
    'no-multiline-imports': noMultilineImports,
    'project-setup': projectSetup,
    'project-structure': projectStructure,
    'sort-imports': sortImports,
  },
} as const
