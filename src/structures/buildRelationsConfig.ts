import { existsSync } from 'node:fs'
import path from 'node:path'

import type { IRelationsConfig, IRelationsRule, IRelationsScope, } from '../types/structure'


function layerPatterns(
  paths: string | string[],
): string[] {
  return Array.isArray(paths) ? paths : [paths]
}

export function buildRelationsSettings(
  relations: IRelationsConfig,
  rootAbsolutePath: string,
): Record<string, unknown> {
  const resolver: Record<string, unknown> = {
    node: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.d.ts', '.mjs', '.cjs'],
    },
  }

  if (existsSync(path.join(rootAbsolutePath, 'tsconfig.json'))) {
    resolver.typescript = {
      alwaysTryTypes: true,
      project: rootAbsolutePath,
    }
  }

  return {
    'boundaries/root-path': rootAbsolutePath,
    'boundaries/elements': Object.entries(relations.layers).map(
      ([type, pattern]) => ({
        type,
        pattern: layerPatterns(pattern),
        partialMatch: false,
        ...(relations.scope?.layers.includes(type)
          ? { capture: [relations.scope.capture] }
          : {}),
      }),
    ),
    'import/resolver': resolver,
  }
}

function fromSelector(from: string): Record<string, unknown> {
  return {
    element: {
      type: from,
    },
  }
}

function targetSelector(type: string): Record<string, unknown> {
  return {
    to: {
      element: {
        type,
      },
    },
  }
}

function scopedTargetSelector(
  type: string,
  scope: IRelationsScope,
): Record<string, unknown> {
  return {
    to: {
      element: {
        type,
        captured: {
          [scope.capture]: `{{ from.element.captured.${scope.capture} }}`,
        },
      },
    },
  }
}

function buildDisallowPolicy(
  rule: IRelationsRule,
  targetLayer: string,
): Record<string, unknown> {
  return {
    from: fromSelector(rule.from),
    disallow: targetSelector(targetLayer),
    ...(rule.message ? { message: rule.message } : {}),
  }
}

function buildScopedAllowPolicy(
  rule: IRelationsRule,
  targetLayer: string,
  scope: IRelationsScope,
): Record<string, unknown> {
  return {
    from: fromSelector(rule.from),
    allow: scopedTargetSelector(targetLayer, scope),
  }
}

function buildTypeAllowPolicy(
  from: string,
): Record<string, unknown> {
  return {
    from: fromSelector(from),
    allow: {
      dependency: {
        kind: 'type',
      },
    },
  }
}

export function buildRelationsRuleOptions(
  relations: IRelationsConfig,
): Record<string, unknown> {
  const layerNames = Object.keys(relations.layers)
  const scope = relations.scope
  const scopeLayers = new Set(scope?.layers ?? [])
  const policies: Array<Record<string, unknown>> = []

  for (const rule of relations.rules) {
    const fromIsScoped = Boolean(
      scope && scopeLayers.has(rule.from),
    )

    if (rule.allow) {
      const allowedLayers = new Set(rule.allow)

      for (const layerName of layerNames) {
        if (layerName === rule.from) continue

        if (!allowedLayers.has(layerName)) {
          policies.push(buildDisallowPolicy(rule, layerName))
          continue
        }

        if (fromIsScoped && scope && scopeLayers.has(layerName)) {
          policies.push(buildDisallowPolicy(rule, layerName))
          policies.push(buildScopedAllowPolicy(rule, layerName, scope))
        }
      }
    } else if (rule.deny) {
      for (const layerName of rule.deny) {
        if (layerName === rule.from) continue

        policies.push(buildDisallowPolicy(rule, layerName))
      }
    }

    const allowSameLayer = rule.allowSameLayer ?? true

    if (!allowSameLayer) {
      policies.push(buildDisallowPolicy(rule, rule.from))
    } else if (fromIsScoped && scope) {
      policies.push(buildDisallowPolicy(rule, rule.from))
      policies.push(buildScopedAllowPolicy(rule, rule.from, scope))
    }

    const allowTypeImports =
      rule.allowTypeImports ?? relations.allowTypeImports ?? false

    if (allowTypeImports) {
      policies.push(buildTypeAllowPolicy(rule.from))
    }
  }

  const checkInternals = relations.rules.some(
    (rule) => rule.allowSameLayer === false,
  )

  return {
    default: 'allow',
    checkAllOrigins: false,
    checkUnknownLocals: false,
    checkInternals,
    policies,
  }
}
