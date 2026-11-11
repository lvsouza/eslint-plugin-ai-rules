import type { ESLint, Linter } from 'eslint'

import type { IProjectDefinition } from './types/structure'
import { recommended } from './configs/recommended'
import { projects } from './configs/projects'
import { plugin } from './plugin'

export type { IAiRulesSettings, INameRule, IProjectDefinition, IProjectPreset, IProjectRulesOverride, IProjectStructure, IRelationsConfig, IRelationsRule, IRelationsScope, IResolvedProject, IStructureNode, TFileRule, TNameCase, TProjectPreset, } from './types/structure'
export { presets } from './structures/presets'
export * from './rules/index'


interface IAiRulesPlugin extends Omit<ESLint.Plugin, 'configs'> {
  configs: {
    recommended: Linter.Config[]
    projects: (definitions: IProjectDefinition[]) => Linter.Config[]
  }
}

const aiGuardPlugin: IAiRulesPlugin = {
  ...plugin,
  configs: {
    recommended,
    projects,
  },
}

export default aiGuardPlugin
export { plugin }
export { recommended }
export { projects }
