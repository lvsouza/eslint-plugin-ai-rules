function expandBraces(pattern: string): string[] {
  const match = pattern.match(/\{([^{}]+)\}/)

  if (!match) return [pattern]

  const [fullMatch, body] = match
  const alternatives = body.split(',')

  return alternatives.flatMap((alternative) =>
    expandBraces(pattern.replace(fullMatch, () => alternative)),
  )
}

function globToRegExp(pattern: string): RegExp {
  let source = '^'

  for (let index = 0; index < pattern.length; index++) {
    const char = pattern[index]

    if (char === '*') {
      if (pattern[index + 1] === '*') {
        if (pattern[index + 2] === '/') {
          source += '(?:.*/)?'
          index += 2
        } else {
          source += '.*'
          index += 1
        }
      } else {
        source += '[^/]*'
      }
      continue
    }

    if (char === '?') {
      source += '[^/]'
      continue
    }

    if ('\\^$+?.()|{}[]'.includes(char)) {
      source += `\\${char}`
      continue
    }

    source += char
  }

  source += '$'

  return new RegExp(source)
}

export function normalizePathPattern(value: string): string {
  return value.replaceAll('\\', '/').replace(/^\.\//, '')
}

export function matchPathPattern(value: string, pattern: string): boolean {
  const normalizedValue = normalizePathPattern(value)

  return expandBraces(normalizePathPattern(pattern)).some((expandedPattern) =>
    globToRegExp(expandedPattern).test(normalizedValue),
  )
}
