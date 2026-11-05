import type { IRelationsConfig } from '@/types/structure'


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
  validateReferences: boolean,
): void {
  if (!Array.isArray(value)) {
    throw new Error(`Invalid relations: "${path}" must be an array.`)
  }

  value.forEach((layerName, index) => {
    assertString(layerName, `${path}[${index}]`)

    if (validateReferences && !layerNames.has(layerName)) {
      throw new Error(
        `Invalid relations: "${path}[${index}]" references unknown layer "${layerName}".`,
      )
    }
  })
}

export function validateRelations(
  value: unknown,
  options: { validateReferences?: boolean } = {},
): asserts value is IRelationsConfig {
  const validateReferences = options.validateReferences ?? true
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

    if (validateReferences && !layerNames.has(rule.from)) {
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

    if (hasAllow) validateLayerReferences(rule.allow, `${rulePath}.allow`, layerNames, validateReferences)
    if (hasDeny) validateLayerReferences(rule.deny, `${rulePath}.deny`, layerNames, validateReferences)

    const layerReferences = (hasAllow ? rule.allow : rule.deny) as string[]

    if (validateReferences && layerReferences.includes(rule.from)) {
      throw new Error(
        `Invalid relations: "${rulePath}" cannot reference its own layer; use "allowSameLayer" instead.`,
      )
    }

    if (rule.allowSameLayer !== undefined && typeof rule.allowSameLayer !== 'boolean') {
      throw new Error(`Invalid relations: "${rulePath}.allowSameLayer" must be a boolean.`)
    }

    if (rule.allowTypeImports !== undefined && typeof rule.allowTypeImports !== 'boolean') {
      throw new Error(`Invalid relations: "${rulePath}.allowTypeImports" must be a boolean.`)
    }

    if (rule.message !== undefined) assertString(rule.message, `${rulePath}.message`)
  })

  if (value.scope !== undefined) {
    if (!isRecord(value.scope)) {
      throw new Error('Invalid relations: "relations.scope" must be an object.')
    }

    assertString(value.scope.capture, 'relations.scope.capture')

    if (!Array.isArray(value.scope.layers) || value.scope.layers.length === 0) {
      throw new Error(
        'Invalid relations: "relations.scope.layers" must be a non-empty array.',
      )
    }

    const scopeLayers = new Set<string>()

    value.scope.layers.forEach((layerName, index) => {
      assertString(layerName, `relations.scope.layers[${index}]`)

      if (validateReferences && !layerNames.has(layerName)) {
        throw new Error(
          `Invalid relations: "relations.scope.layers[${index}]" references unknown layer "${layerName}".`,
        )
      }

      if (scopeLayers.has(layerName)) {
        throw new Error(
          `Invalid relations: duplicate scope layer "${layerName}".`,
        )
      }

      scopeLayers.add(layerName)

      if (!validateReferences) return

      const layerPaths = Array.isArray(layers[layerName])
        ? layers[layerName] as string[]
        : [layers[layerName] as string]

      if (!layerPaths.every((layerPath) => layerPath.includes('*'))) {
        throw new Error(
          `Invalid relations: scope layer "${layerName}" must use a pattern with a wildcard.`,
        )
      }
    })

  }
}
