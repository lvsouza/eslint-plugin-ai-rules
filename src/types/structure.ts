import type { Linter } from 'eslint'


export type TProjectPreset = 'frontend' | 'backend' | 'other'

export type TNameCase = 'PascalCase' | 'camelCase' | 'kebab-case' | 'snake_case'

export interface INameRule {
  case?: TNameCase
  prefix?: string
  suffix?: string
  pattern?: string
}

export type TFileRule = string | ({ extensions: string[] } & INameRule)

export interface IStructureNode {
  name?: INameRule
  files?: TFileRule[]
  additionalFiles?: TFileRule[]
  folders?: Record<string, IStructureNode>
  ignore?: boolean
}

export interface IProjectStructure extends IStructureNode {
  ignoredPaths?: string[]
}

export interface IProjectDefinition {
  rootFolder: string
  preset?: TProjectPreset
  structure?: IProjectStructure
}

export interface IProjectPreset {
  structure: IProjectStructure
  rules?: Linter.RulesRecord
}

export interface IResolvedProject {
  rootFolder: string
  structure: IProjectStructure
}

export interface IAiRulesSettings {
  project?: IResolvedProject
  projects?: IResolvedProject[]
}
