import type { Linter } from 'eslint'
import path from 'node:path'

import type { IProjectDefinition, IProjectPreset, IProjectRulesOverride, IProjectStructure, TProjectPreset, } from '@/types/structure'
import { buildRelationsRuleOptions, buildRelationsSettings } from '@/structures/buildRelationsConfig'
import { buildImportResolvers } from '@/utils/buildImportResolvers'
import { hasStructureRules } from '@/structures/hasStructureRules'
import { validateRelations } from '@/structures/validateRelations'
import { validateStructure } from '@/structures/validateStructure'
import { BUNDLED_RULE_IDS, RULE_IDS } from '@/rules/constants'
import { mergeRelations } from '@/structures/mergeRelations'
import { mergeStructure } from '@/structures/mergeStructure'
import { getPreset } from '@/structures/presets'
import { recommended } from './recommended'


const PROJECT_PRESETS: TProjectPreset[] = ['frontend', 'nextjs', 'backend', 'other']

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

function isInside(parent: string, child: string): boolean {
  if (parent === child) return false
  if (parent === '.') return true

  return child.startsWith(`${parent}/`)
}

function findNestedRoots(
  rootFolder: string,
  definitions: Array<{ rootFolder: string }>,
): string[] {
  return definitions
    .map((definition) => definition.rootFolder)
    .filter((candidate) => isInside(rootFolder, candidate))
}

function isRulesRecord(value: unknown): value is Linter.RulesRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value)
  )
}

function validateRulesOverrides(
  value: unknown,
  label: string,
): asserts value is IProjectRulesOverride[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label} overrides must be an array.`)
  }

  value.forEach((entry, index) => {
    const overridePath = `${label} overrides[${index}]`

    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`${overridePath} must be an object.`)
    }

    const override = entry as Record<string, unknown>

    if (!Array.isArray(override.files) || override.files.length === 0) {
      throw new Error(`${overridePath}.files must be a non-empty array.`)
    }

    override.files.forEach((file, fileIndex) => {
      if (typeof file !== 'string' || file.trim().length === 0) {
        throw new Error(
          `${overridePath}.files[${fileIndex}] must be a non-empty string.`,
        )
      }
    })

    if (!isRulesRecord(override.rules)) {
      throw new Error(`${overridePath}.rules must be an object.`)
    }
  })
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

      throw new Error(`Invalid project at index ${index}: ${message}`, {
        cause: error,
      })
    }
  }

  if (definition.relations !== undefined) {
    try {
      validateRelations(definition.relations, { validateReferences: false })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      throw new Error(`Invalid project at index ${index}: ${message}`, {
        cause: error,
      })
    }
  }

  if (!isRulesRecord(definition.rules) && definition.rules !== undefined) {
    throw new Error(
      `Invalid project at index ${index}: rules must be an object.`,
    )
  }

  if (definition.overrides !== undefined) {
    try {
      validateRulesOverrides(
        definition.overrides,
        `Invalid project at index ${index}:`,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)

      throw new Error(message, { cause: error })
    }
  }
}

function resolveStructure(
  definition: IProjectDefinition,
  preset: IProjectPreset | undefined,
  index: number,
): IProjectStructure {
  const structure = mergeStructure(preset?.structure, definition.structure)

  try {
    validateStructure(structure)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    throw new Error(
      `Invalid project at index ${index}: merged structure is invalid. ${message}`,
      { cause: error },
    )
  }

  return structure
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

  const seenRoots = new Set<string>()

  for (const definition of normalizedDefinitions) {
    if (seenRoots.has(definition.rootFolder)) {
      throw new Error(
        `Invalid projects: rootFolder "${definition.rootFolder}" is duplicated.`,
      )
    }

    seenRoots.add(definition.rootFolder)
  }

  const configs: Linter.Config[] = []

  normalizedDefinitions.forEach((definition, index) => {
    const preset = definition.preset ? getPreset(definition.preset) : undefined
    const structure = resolveStructure(definition, preset, index)
    const structureEnabled = hasStructureRules(structure)
    const relations = mergeRelations(preset?.relations, definition.relations)

    if (relations) {
      try {
        validateRelations(relations)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)

        throw new Error(`Invalid project at index ${index}: ${message}`, {
          cause: error,
        })
      }
    }
    const rootAbsolutePath = path.resolve(process.cwd(), definition.rootFolder)
    const baseConfig = recommended[0]
    const rootPrefix = definition.rootFolder === '.'
      ? ''
      : `${definition.rootFolder}/`
    const nestedRoots = findNestedRoots(
      definition.rootFolder,
      normalizedDefinitions,
    )
    const ignoredPaths = Array.from(new Set([
      ...(structure.ignoredPaths ?? []).map(
        (pattern) => `${rootPrefix}${pattern}`,
      ),
      ...nestedRoots.map((nestedRoot) => `${nestedRoot}/**`),
    ]))
    const rules: Linter.RulesRecord = {
      ...baseConfig.rules,
      [RULE_IDS.projectStructure]: structureEnabled ? 'error' : 'off',
      [RULE_IDS.filenamePascalCase]: structureEnabled
        ? 'off'
        : baseConfig.rules?.[RULE_IDS.filenamePascalCase] ?? 'error',
      ...(relations
        ? {
            [BUNDLED_RULE_IDS.dependencies]: [
              'error',
              buildRelationsRuleOptions(relations),
            ],
          }
        : {}),
      ...(preset?.rules ?? {}),
      ...(definition.rules ?? {}),
    }
    const settings = {
      ...baseConfig.settings,
      'import-x/resolver-next': buildImportResolvers(rootAbsolutePath),
      ...(relations
        ? buildRelationsSettings(relations, rootAbsolutePath)
        : {}),
      'ai-rules': {
        project: {
          rootFolder: definition.rootFolder,
          preset: definition.preset,
          structure,
          relations,
        },
      },
    }
    const sharedConfig = {
      ...baseConfig,
      plugins: {
        ...baseConfig.plugins,
      },
      ...(ignoredPaths.length > 0 ? { ignores: ignoredPaths } : {}),
      settings,
    }

    configs.push({
      ...sharedConfig,
      files: [`${rootPrefix}**/*.{js,cjs,mjs,jsx,ts,tsx}`],
      rules,
    })

    const overrides = [
      ...(preset?.overrides ?? []),
      ...(definition.overrides ?? []),
    ]

    for (const override of overrides) {
      configs.push({
        ...sharedConfig,
        files: override.files.map((file) => `${rootPrefix}${file}`),
        rules: {
          ...override.rules,
          ...(preset?.rules ?? {}),
          ...(definition.rules ?? {}),
        },
      })
    }
  })

  return configs
}
