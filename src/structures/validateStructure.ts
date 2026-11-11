import type { IProjectStructure } from '@/types/structure'
import { assertKnownKeys } from '@/utils/assertKnownKeys'
import { isNameCase } from '@/utils/matchNameRule'


const DYNAMIC_FOLDER_PATTERN = /^\[.+\]$/

const NODE_KEYS = new Set([
  'name',
  'files',
  'additionalFiles',
  'folders',
  'ignore',
])
const ROOT_KEYS = new Set([...NODE_KEYS, 'ignoredPaths'])
const NAME_RULE_KEYS = new Set(['case', 'prefix', 'suffix', 'pattern'])
const FILE_RULE_KEYS = new Set([
  'extensions',
  'case',
  'prefix',
  'suffix',
  'pattern',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertString(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Invalid structure: "${path}" must be a non-empty string.`)
  }
}

function validateRegex(value: unknown, path: string): void {
  assertString(value, path)

  try {
    new RegExp(value)
  } catch {
    throw new Error(`Invalid structure: "${path}" must be a valid regular expression.`)
  }
}

function validateNameRule(value: unknown, path: string): void {
  if (!isRecord(value)) {
    throw new Error(`Invalid structure: "${path}" must be an object.`)
  }

  assertKnownKeys(value, NAME_RULE_KEYS, path, 'Invalid structure')

  if (value.case !== undefined) {
    if (typeof value.case !== 'string' || !isNameCase(value.case)) {
      throw new Error(
        `Invalid structure: "${path}.case" must be one of: PascalCase, camelCase, kebab-case, snake_case.`,
      )
    }
  }

  if (value.prefix !== undefined) assertString(value.prefix, `${path}.prefix`)
  if (value.suffix !== undefined) assertString(value.suffix, `${path}.suffix`)
  if (value.pattern !== undefined) validateRegex(value.pattern, `${path}.pattern`)
}

function validateFileRule(value: unknown, path: string): void {
  if (typeof value === 'string') {
    assertString(value, path)
    return
  }

  if (!isRecord(value)) {
    throw new Error(`Invalid structure: "${path}" must be a string or an object.`)
  }

  assertKnownKeys(value, FILE_RULE_KEYS, path, 'Invalid structure')

  if (!Array.isArray(value.extensions) || value.extensions.length === 0) {
    throw new Error(
      `Invalid structure: "${path}.extensions" must be a non-empty array of strings.`,
    )
  }

  value.extensions.forEach((extension, index) => {
    if (typeof extension !== 'string' || !extension.startsWith('.')) {
      throw new Error(
        `Invalid structure: "${path}.extensions[${index}]" must start with a dot.`,
      )
    }
  })

  if (value.case !== undefined) {
    if (typeof value.case !== 'string' || !isNameCase(value.case)) {
      throw new Error(
        `Invalid structure: "${path}.case" must be one of: PascalCase, camelCase, kebab-case, snake_case.`,
      )
    }
  }

  if (value.prefix !== undefined) assertString(value.prefix, `${path}.prefix`)
  if (value.suffix !== undefined) assertString(value.suffix, `${path}.suffix`)
  if (value.pattern !== undefined) validateRegex(value.pattern, `${path}.pattern`)
}

function validateFileRules(value: unknown, path: string): void {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid structure: "${path}" must be an array.`)
  }

  value.forEach((rule, index) => validateFileRule(rule, `${path}[${index}]`))
}

function validateNode(
  value: unknown,
  path: string,
  isRoot = false,
): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Invalid structure: "${path}" must be an object.`)
  }

  assertKnownKeys(
    value,
    isRoot ? ROOT_KEYS : NODE_KEYS,
    path,
    'Invalid structure',
  )

  if (value.name !== undefined) {
    if (isRoot) {
      throw new Error(`Invalid structure: "${path}.name" is only allowed for dynamic folders.`)
    }

    validateNameRule(value.name, `${path}.name`)
  }

  if (value.ignore !== undefined && typeof value.ignore !== 'boolean') {
    throw new Error(`Invalid structure: "${path}.ignore" must be a boolean.`)
  }

  if (value.files !== undefined) validateFileRules(value.files, `${path}.files`)
  if (value.additionalFiles !== undefined) {
    validateFileRules(value.additionalFiles, `${path}.additionalFiles`)
  }

  if (value.folders !== undefined) {
    if (!isRecord(value.folders)) {
      throw new Error(`Invalid structure: "${path}.folders" must be an object.`)
    }

    let dynamicFolders = 0

    for (const [folderName, child] of Object.entries(value.folders)) {
      if (folderName.trim().length === 0) {
        throw new Error(`Invalid structure: "${path}.folders" cannot have empty keys.`)
      }

      const isDynamicFolder = DYNAMIC_FOLDER_PATTERN.test(folderName)

      if (isDynamicFolder) {
        dynamicFolders += 1
      } else if (isRecord(child) && child.name !== undefined) {
        throw new Error(
          `Invalid structure: "${path}.folders.${folderName}.name" is only allowed for dynamic folders.`,
        )
      }

      validateNode(child, `${path}.folders.${folderName}`)
    }

    if (dynamicFolders > 1) {
      throw new Error(
        `Invalid structure: "${path}.folders" can have only one dynamic folder per level.`,
      )
    }
  }
}

export function validateStructure(value: unknown): asserts value is IProjectStructure {
  validateNode(value, 'structure', true)

  if (value.ignoredPaths !== undefined) {
    if (!Array.isArray(value.ignoredPaths)) {
      throw new Error('Invalid structure: "structure.ignoredPaths" must be an array.')
    }

    value.ignoredPaths.forEach((pattern, index) => {
      assertString(pattern, `structure.ignoredPaths[${index}]`)
    })
  }
}
