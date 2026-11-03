import { filenamePascalCase } from './rules/FilenamePascalCase'
import { noMultilineImports } from './rules/NoMultilineImports'
import { projectStructure } from './rules/ProjectStructure'
import { sortImports } from './rules/SortImports'


export const plugin = {
  meta: {
    name: 'eslint-plugin-ai-rules',
    version: '0.2.1',
  },
  rules: {
    'filename-pascal-case': filenamePascalCase,
    'no-multiline-imports': noMultilineImports,
    'project-structure': projectStructure,
    'sort-imports': sortImports,
  },
} as const
