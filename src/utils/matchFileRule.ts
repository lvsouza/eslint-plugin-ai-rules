import { describeNameRule, matchesNameRule } from './matchNameRule'
import { matchPathPattern } from './matchPathPattern'
import type { TFileRule } from '../types/structure'


export function getMatchingExtension(
  filename: string,
  extensions: string[],
): string | undefined {
  return [...extensions]
    .sort((left, right) => right.length - left.length)
    .find((extension) => filename.endsWith(extension))
}

export function matchesFileRule(filename: string, rule: TFileRule): boolean {
  if (typeof rule === 'string') return matchPathPattern(filename, rule)

  const extension = getMatchingExtension(filename, rule.extensions)

  if (!extension) return false

  const baseName = filename.slice(0, -extension.length)

  return matchesNameRule(baseName, rule)
}

export function fileRuleMatchesExtension(filename: string, rule: TFileRule): boolean {
  if (typeof rule === 'string') return false

  return getMatchingExtension(filename, rule.extensions) !== undefined
}

export function describeFileRule(rule: TFileRule): string {
  if (typeof rule === 'string') return rule

  const extensions = rule.extensions.join(', ')

  return `${describeNameRule(rule)}, extension ${extensions}`
}
