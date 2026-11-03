import type { IRelationsConfig, IRelationsRule, IRelationsScope, } from '../types/structure'


function cloneLayerPaths(paths: string | string[]): string | string[] {
  return Array.isArray(paths) ? [...paths] : paths
}

function cloneRule(rule: IRelationsRule): IRelationsRule {
  return {
    ...rule,
    ...(rule.allow ? { allow: [...rule.allow] } : {}),
    ...(rule.deny ? { deny: [...rule.deny] } : {}),
  }
}

function cloneScope(scope: IRelationsScope): IRelationsScope {
  return {
    ...scope,
    layers: [...scope.layers],
  }
}

export function mergeRelations(
  base?: IRelationsConfig,
  override?: IRelationsConfig,
): IRelationsConfig | undefined {
  if (!base && !override) return undefined

  const layers = {
    ...(base?.layers ?? {}),
    ...(override?.layers ?? {}),
  }
  const normalizedLayers = Object.fromEntries(
    Object.entries(layers).map(([layerName, paths]) => [
      layerName,
      cloneLayerPaths(paths),
    ]),
  )

  const rules = (base?.rules ?? []).map(cloneRule)

  for (const overrideRule of override?.rules ?? []) {
    const index = rules.findIndex((rule) => rule.from === overrideRule.from)

    if (index >= 0) {
      rules[index] = cloneRule(overrideRule)
    } else {
      rules.push(cloneRule(overrideRule))
    }
  }

  const scope = override?.scope
    ? cloneScope(override.scope)
    : base?.scope
      ? cloneScope(base.scope)
      : undefined

  const allowTypeImports =
    override?.allowTypeImports ?? base?.allowTypeImports

  return {
    layers: normalizedLayers,
    rules,
    ...(allowTypeImports !== undefined ? { allowTypeImports } : {}),
    ...(scope ? { scope } : {}),
  }
}
