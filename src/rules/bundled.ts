import boundaries from 'eslint-plugin-boundaries'
import { importX } from 'eslint-plugin-import-x'
import stylistic from '@stylistic/eslint-plugin'
import tseslint from 'typescript-eslint'
import type { Rule } from 'eslint'

import { RULE_NAMES } from './constants'


type TBundledRuleSource = {
  name: string
  rules: Record<string, Rule.RuleModule>
}

const SOURCES: TBundledRuleSource[] = [
  { name: 'import-x', rules: importX.rules },
  { name: 'stylistic', rules: stylistic.rules },
  {
    name: 'typescript-eslint',
    rules: (tseslint.plugin as unknown as {
      rules: Record<string, Rule.RuleModule>
    }).rules,
  },
  { name: 'boundaries', rules: boundaries.rules },
]

const OWN_RULE_NAMES = new Set<string>(Object.values(RULE_NAMES))

export function buildBundledRules(
  sources: TBundledRuleSource[] = SOURCES,
): Record<string, Rule.RuleModule> {
  const counts = new Map<string, number>()

  for (const source of sources) {
    for (const ruleName of Object.keys(source.rules)) {
      counts.set(ruleName, (counts.get(ruleName) ?? 0) + 1)
    }
  }

  const rules: Record<string, Rule.RuleModule> = {}

  for (const source of sources) {
    for (const [ruleName, rule] of Object.entries(source.rules)) {
      const needsPrefix =
        (counts.get(ruleName) ?? 0) > 1 || OWN_RULE_NAMES.has(ruleName)
      const alias = needsPrefix ? `${source.name}-${ruleName}` : ruleName

      if (rules[alias] || OWN_RULE_NAMES.has(alias)) {
        throw new Error(`Duplicate bundled rule alias: ${alias}`)
      }

      rules[alias] = rule
    }
  }

  return rules
}

export const BUNDLED_RULE_SOURCES = SOURCES
export const bundledRules = buildBundledRules()
