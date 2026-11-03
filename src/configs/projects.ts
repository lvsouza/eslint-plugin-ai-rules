import type { Linter } from 'eslint'
import path from 'node:path'

import type { IProjectDefinition, IProjectPreset, IProjectStructure, TProjectPreset, } from '../types/structure'
import { validateStructure } from '../structures/validateStructure'
import { mergeStructure } from '../structures/mergeStructure'
import { getPreset } from '../structures/presets'
import { recommended } from './recommended'


const PROJECT_PRESETS: TProjectPreset[] = ['frontend', 'backend', 'other']

function normalizeRootFolder(rootFolder: string): string {
  const absolutePath = path.resolve(process.cwd(), rootFolder.trim())
  const relativePath = path.relative(process.cwd(), absolutePath)

  if (relativePath.length === 0) return '.'

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(
      `Invalid project: rootFolder "${rootFolder}" must be inside the current working directory.`,
    )
  }

  return relativePath.split(path.sep).join('/')
}

function isSameOrInside(parent: string, child: string): boolean {
  if (parent === child) return true
  if (parent === '.') return true

  return child.startsWith(`${parent}/`)
}

function hasStructureRules(structure: IProjectStructure): boolean {
  return (
    structure.ignore !== undefined ||
    structure.name !== undefined ||
    structure.files !== undefined ||
    structure.additionalFiles !== undefined ||
    structure.folders !== undefined
  )
}

function validateDefinition(
  definition: IProjectDefinition,
  index: number,
): void {
  if (!definition || typeof definition !== 'object') {
    throw new Error(`Invalid project at index ${index}: definition must be an object.`)
  }

  if (
    typeof definition.rootFolder !== 'string' ||
    definition.rootFolder.trim().length === 0
  ) {
    throw new Error(
      `Invalid project at index ${index}: rootFolder must be a non-empty string.`,
    )
  }

  if (
    definition.preset !== undefined &&
    !PROJECT_PRESETS.includes(definition.preset)
  ) {
    throw new Error(
      `Invalid project at index ${index}: preset must be one of: ${PROJECT_PRESETS.join(', ')}.`,
    )
  }

  if (definition.structure !== undefined) {
    try {
      validateStructure(definition.structure)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      throw new Error(`Invalid project at index ${index}: ${message}`)
    }
  }
}

function resolveStructure(
  definition: IProjectDefinition,
  preset?: IProjectPreset,
): IProjectStructure {
  return mergeStructure(preset?.structure, definition.structure)
}

export function projects(definitions: IProjectDefinition[]): Linter.Config[] {
  if (!Array.isArray(definitions) || definitions.length === 0) {
    throw new Error('projects() requires a non-empty array of project definitions.')
  }

  const normalizedDefinitions = definitions.map((definition, index) => {
    validateDefinition(definition, index)

    return {
      ...definition,
      rootFolder: normalizeRootFolder(definition.rootFolder),
    }
  })

  for (let left = 0; left < normalizedDefinitions.length; left++) {
    for (let right = left + 1; right < normalizedDefinitions.length; right++) {
      const leftRoot = normalizedDefinitions[left].rootFolder
      const rightRoot = normalizedDefinitions[right].rootFolder

      if (isSameOrInside(leftRoot, rightRoot) || isSameOrInside(rightRoot, leftRoot)) {
        throw new Error(
          `Invalid projects: rootFolder "${leftRoot}" overlaps with "${rightRoot}".`,
        )
      }
    }
  }

  return normalizedDefinitions.map((definition) => {
    const preset = definition.preset ? getPreset(definition.preset) : undefined
    const structure = resolveStructure(definition, preset)
    const structureEnabled = hasStructureRules(structure)
    const baseConfig = recommended[0]
    const rootPrefix = definition.rootFolder === '.'
      ? ''
      : `${definition.rootFolder}/`
    const ignoredPaths = (structure.ignoredPaths ?? []).map(
      (pattern) => `${rootPrefix}${pattern}`,
    )
    const rules: Linter.RulesRecord = {
      ...baseConfig.rules,
      ...(preset?.rules ?? {}),
      'ai-rules/project-structure': structureEnabled ? 'error' : 'off',
      'ai-rules/filename-pascal-case': structureEnabled
        ? 'off'
        : baseConfig.rules?.['ai-rules/filename-pascal-case'] ?? 'error',
    }

    return {
      ...baseConfig,
      files: [`${rootPrefix}**/*.{js,cjs,mjs,jsx,ts,tsx}`],
      ...(ignoredPaths.length > 0 ? { ignores: ignoredPaths } : {}),
      settings: {
        ...baseConfig.settings,
        'ai-rules': {
          project: {
            rootFolder: definition.rootFolder,
            structure,
          },
        },
      },
      rules,
    }
  })
}
