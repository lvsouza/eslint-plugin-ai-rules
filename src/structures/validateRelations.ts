import type { IRelationsConfig } from '../types/structure'


function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function assertString(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Invalid relations: "${path}" must be a non-empty string.`)
  }
}

function validatePaths(value: unknown, path: string): void {
  const paths = Array.isArray(value) ? value : [value]

  if (paths.length === 0) {
    throw new Error(`Invalid relations: "${path}" must contain at least one path.`)
  }

  paths.forEach((entry, index) => {
    assertString(entry, Array.isArray(value) ? `${path}[${index}]` : path)
  })
}

function validateLayerReferences(
  value: unknown,
  path: string,
  layerNames: Set<string>,
): void {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid relations: "${path}" must be an array.`)
  }

  value.forEach((layerName, index) => {
    assertString(layerName, `${path}[${index}]`)

    if (!layerNames.has(layerName)) {
      throw new Error(
        `Invalid relations: "${path}[${index}]" references unknown layer "${layerName}".`,
      )
    }
  })
}

export function validateRelations(
  value: unknown,
): asserts value is IRelationsConfig {
  if (!isRecord(value)) {
    throw new Error('Invalid relations: relations must be an object.')
  }

  if (!isRecord(value.layers)) {
    throw new Error('Invalid relations: "relations.layers" must be an object.')
  }

  const layers = value.layers
  const layerNames = new Set(Object.keys(layers))

  if (layerNames.size === 0) {
    throw new Error('Invalid relations: "relations.layers" cannot be empty.')
  }

  for (const [layerName, paths] of Object.entries(layers)) {
    assertString(layerName, 'relations.layers key')
    validatePaths(paths, `relations.layers.${layerName}`)
  }

  if (value.allowTypeImports !== undefined && typeof value.allowTypeImports !== 'boolean') {
    throw new Error('Invalid relations: "relations.allowTypeImports" must be a boolean.')
  }

  if (!Array.isArray(value.rules)) {
    throw new Error('Invalid relations: "relations.rules" must be an array.')
  }

  const fromLayers = new Set<string>()

  value.rules.forEach((rule, index) => {
    const rulePath = `relations.rules[${index}]`

    if (!isRecord(rule)) {
      throw new Error(`Invalid relations: "${rulePath}" must be an object.`)
    }

    assertString(rule.from, `${rulePath}.from`)

    if (!layerNames.has(rule.from)) {
      throw new Error(
        `Invalid relations: "${rulePath}.from" references unknown layer "${rule.from}".`,
      )
    }

    if (fromLayers.has(rule.from)) {
      throw new Error(
        `Invalid relations: duplicate rule for layer "${rule.from}" at "${rulePath}".`,
      )
    }

    fromLayers.add(rule.from)

    const hasAllow = rule.allow !== undefined
    const hasDeny = rule.deny !== undefined

    if (hasAllow === hasDeny) {
      throw new Error(
        `Invalid relations: "${rulePath}" must define exactly one of "allow" or "deny".`,
      )
    }

    if (hasAllow) validateLayerReferences(rule.allow, `${rulePath}.allow`, layerNames)
    if (hasDeny) validateLayerReferences(rule.deny, `${rulePath}.deny`, layerNames)

    if (rule.allowTypeImports !== undefined && typeof rule.allowTypeImports !== 'boolean') {
      throw new Error(`Invalid relations: "${rulePath}.allowTypeImports" must be a boolean.`)
    }

    if (rule.message !== undefined) assertString(rule.message, `${rulePath}.message`)
  })
}
