import { existsSync } from 'node:fs'
import path from 'node:path'

import type { IRelationsConfig, IRelationsRule } from '../types/structure'


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
        pattern: Array.isArray(pattern) ? pattern : [pattern],
        partialMatch: false,
      }),
    ),
    'import/resolver': resolver,
  }
}

function buildDisallowPolicy(
  rule: IRelationsRule,
  targetLayer: string,
): Record<string, unknown> {
  return {
    from: {
      element: {
        type: rule.from,
      },
    },
    disallow: {
      to: {
        element: {
          types: [targetLayer],
        },
      },
    },
    ...(rule.message ? { message: rule.message } : {}),
  }
}

export function buildRelationsRuleOptions(
  relations: IRelationsConfig,
): Record<string, unknown> {
  const layerNames = Object.keys(relations.layers)
  const policies: Array<Record<string, unknown>> = []

  for (const rule of relations.rules) {
    if (rule.allow) {
      const allowedLayers = new Set(rule.allow)

      for (const layerName of layerNames) {
        if (layerName === rule.from || allowedLayers.has(layerName)) continue

        policies.push(buildDisallowPolicy(rule, layerName))
      }
    } else if (rule.deny) {
      for (const layerName of rule.deny) {
        if (layerName === rule.from) continue

        policies.push(buildDisallowPolicy(rule, layerName))
      }
    }

    const allowTypeImports =
      rule.allowTypeImports ?? relations.allowTypeImports ?? false

    if (allowTypeImports) {
      policies.push({
        from: {
          element: {
            type: rule.from,
          },
        },
        allow: {
          dependency: {
            kind: 'type',
          },
        },
      })
    }
  }

  return {
    default: 'allow',
    checkAllOrigins: false,
    checkUnknownLocals: false,
    checkInternals: false,
    policies,
  }
}
