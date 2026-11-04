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

export interface IRelationsRule {
  from: string
  allow?: string[]
  deny?: string[]
  allowSameLayer?: boolean
  allowTypeImports?: boolean
  message?: string
}

export interface IRelationsScope {
  capture: string
  layers: string[]
}

export interface IRelationsConfig {
  layers: Record<string, string | string[]>
  rules: IRelationsRule[]
  allowTypeImports?: boolean
  scope?: IRelationsScope
}

export interface IProjectDefinition {
  rootFolder: string
  preset?: TProjectPreset
  structure?: IProjectStructure
  relations?: IRelationsConfig
  rules?: Linter.RulesRecord
}

export interface IProjectPreset {
  structure: IProjectStructure
  relations?: IRelationsConfig
  rules?: Linter.RulesRecord
}

export interface IResolvedProject {
  rootFolder: string
  preset?: TProjectPreset
  structure: IProjectStructure
  relations?: IRelationsConfig
}

export interface IAiRulesSettings {
  project?: IResolvedProject
  projects?: IResolvedProject[]
}
