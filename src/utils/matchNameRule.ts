import type { INameRule, TNameCase } from '@/types/structure'


const CASE_PATTERNS: Record<TNameCase, RegExp> = {
  PascalCase: /^[A-Z][a-zA-Z0-9]*$/,
  camelCase: /^[a-z][a-zA-Z0-9]*$/,
  'kebab-case': /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/,
  snake_case: /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/,
}

export const NAME_CASES = Object.keys(CASE_PATTERNS) as TNameCase[]

export function isNameCase(value: string): value is TNameCase {
  return value in CASE_PATTERNS
}

export function matchesNameCase(value: string, caseName: TNameCase): boolean {
  return CASE_PATTERNS[caseName].test(value)
}

export function matchesNameRule(value: string, rule: INameRule): boolean {
  if (rule.case && !matchesNameCase(value, rule.case)) return false
  if (rule.prefix && !value.startsWith(rule.prefix)) return false
  if (rule.suffix && !value.endsWith(rule.suffix)) return false
  if (rule.pattern) {
    try {
      if (!new RegExp(rule.pattern).test(value)) return false
    } catch {
      return false
    }
  }
  return true
}

export function describeNameRule(rule: INameRule): string {
  const parts: string[] = []

  if (rule.case) parts.push(rule.case)
  if (rule.prefix) parts.push(`prefix "${rule.prefix}"`)
  if (rule.suffix) parts.push(`suffix "${rule.suffix}"`)
  if (rule.pattern) parts.push(`pattern /${rule.pattern}/`)

  return parts.length > 0 ? parts.join(', ') : 'any name'
}
