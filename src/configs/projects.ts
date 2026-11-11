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
import { assertKnownKeys } from '@/utils/assertKnownKeys'
import { getPreset } from '@/structures/presets'
import { recommended } from './recommended'


const PROJECT_PRESETS: TProjectPreset[] = ['frontend', 'nextjs', 'backend', 'other']
const OVERRIDE_KEYS = new Set(['files', 'rules'])

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

function normalizeOverrideFile(file: string, pathLabel: string): string {
  const trimmed = file.trim()
  const negated = trimmed.startsWith('!')
  const raw = negated ? trimmed.slice(1) : trimmed
  const normalized = raw.replaceAll('\\', '/').replace(/^\.\//, '')

  if (normalized.length === 0) {
    throw new Error(`${pathLabel} must be a non-empty string.`)
  }

  if (
    path.isAbsolute(normalized) ||
    /^[A-Za-z]:\//.test(normalized) ||
    normalized.split('/').includes('..')
  ) {
    throw new Error(
      `${pathLabel} must be inside the project rootFolder.`,
    )
  }

  return negated ? `!${normalized}` : normalized
}

function normalizeRulesOverrides(
  value: unknown,
  label: string,
): IProjectRulesOverride[] {
  if (!Array.isArray(value)) {
    throw new Error(`${label}: overrides must be an array.`)
  }

  return value.map((entry, index) => {
    const overridePath = `overrides[${index}]`

    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`${label}: "${overridePath}" must be an object.`)
    }

    const override = entry as Record<string, unknown>

    assertKnownKeys(override, OVERRIDE_KEYS, overridePath, label)

    if (!Array.isArray(override.files) || override.files.length === 0) {
      throw new Error(
        `${label}: "${overridePath}.files" must be a non-empty array.`,
      )
    }

    const files = override.files.map((file, fileIndex) => {
      const filePath = `${overridePath}.files[${fileIndex}]`

      if (typeof file !== 'string') {
        throw new Error(`${label}: "${filePath}" must be a non-empty string.`)
      }

      return normalizeOverrideFile(file, `${label}: "${filePath}"`)
    })

    if (!isRulesRecord(override.rules)) {
      throw new Error(`${label}: "${overridePath}.rules" must be an object.`)
    }

    return {
      files,
      rules: override.rules,
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

  if (
    definition.typeAware !== undefined &&
    typeof definition.typeAware !== 'boolean'
  ) {
    throw new Error(
      `Invalid project at index ${index}: typeAware must be a boolean.`,
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
      normalizeRulesOverrides(
        definition.overrides,
        `Invalid project at index ${index}`,
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
    const typeAware = definition.typeAware ?? preset?.typeAware ?? false

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
      ...(typeAware
        ? {
            [BUNDLED_RULE_IDS.noFloatingPromises]: 'error',
            [BUNDLED_RULE_IDS.noMisusedPromises]: 'error',
            [BUNDLED_RULE_IDS.awaitThenable]: 'error',
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
          typeAware,
        },
      },
    }
    const sharedConfig = {
      ...baseConfig,
      plugins: {
        ...baseConfig.plugins,
      },
      ...(ignoredPaths.length > 0 ? { ignores: ignoredPaths } : {}),
      ...(typeAware
        ? {
            languageOptions: {
              parserOptions: {
                projectService: true,
                tsconfigRootDir: rootAbsolutePath,
              },
            },
          }
        : {}),
      settings,
    }

    configs.push({
      ...sharedConfig,
      files: [`${rootPrefix}**/*.{js,cjs,mjs,jsx,ts,tsx}`],
      rules,
    })

    const overrides = [
      ...(preset?.overrides
        ? normalizeRulesOverrides(
            preset.overrides,
            `Invalid preset "${definition.preset}"`,
          )
        : []),
      ...(definition.overrides
        ? normalizeRulesOverrides(
            definition.overrides,
            `Invalid project at index ${index}`,
          )
        : []),
    ]

    for (const override of overrides) {
      configs.push({
        ...sharedConfig,
        files: override.files.map((file) => {
          if (file.startsWith('!')) {
            return `!${rootPrefix}${file.slice(1)}`
          }

          return `${rootPrefix}${file}`
        }),
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
