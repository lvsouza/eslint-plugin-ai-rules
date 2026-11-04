import type { Rule } from 'eslint'


export const sortImports: Rule.RuleModule = {
  meta: {
    type: 'layout',
    docs: {
      description:
        'Enforce sorted imports by group and line length descending, collapsing multiline imports',
      recommended: true,
      url: 'https://github.com/lvsouza/eslint-ai-guard/blob/main/README.md#ai-rulessort-imports',
    },
    fixable: 'code',
    schema: [],
    messages: {
      sortRequired:
        'Imports must be sorted by group and line length, each on a single line.',
    },
  },
  create(context) {
    return {
      Program(node) {
        const sourceCode = context.sourceCode
        const content = sourceCode.text

        const newContent = getSortedContent(content)

        if (newContent && newContent !== content) {
          context.report({
            node,
            messageId: 'sortRequired',
            fix(fixer) {
              return fixer.replaceText(node, newContent)
            },
          })
        }
      },
    }
  },
}

// ---------------------------------------------------------------------------
// Supporting types
// ---------------------------------------------------------------------------
type TImportItem = {
  line: string
  from: string
}

// ---------------------------------------------------------------------------
// Core logic - exported for testing and reuse
// ---------------------------------------------------------------------------
export function getSortedContent(content: string): string | null {
  const collapseMultiline = (match: string) => {
    return match
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/\s+/g, ' ')
  }

  const normalizedContent = content
    .replace(/import\s+([^'";]+?)\s+from\s+(['"][^'"]+['"])/g, collapseMultiline)
    // Only valid re-exports: export { ... } from / export * from / export * as X from / export type { ... } from
    .replace(/export\s+(?:type\s+)?(?:\{[^}]*\}|\*(?:\s+as\s+\w+)?)\s+from\s+(['"][^'"]+['"])/g, collapseMultiline)

  const lines: string[] = normalizedContent.split('\n')

  const directiveLines: string[] = []
  const reactFirstLine: string[] = []
  const externalLines: TImportItem[] = []
  const internalLines: TImportItem[] = []
  const reExportLines: TImportItem[] = []
  const nonImportLines: string[] = []

  let inImportBlock = false
  let canAcceptDirectives = true

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim()

    if (
      /^(function|const|let|var|class|interface|enum)\b/.test(trimmed) ||
      (/^(type|export)\b/.test(trimmed) && !/ from ['"]/.test(trimmed) && !/^export\s*\{[^}]*\}\s*from/.test(trimmed) && !/^export\s*\*/.test(trimmed)) ||
      trimmed.startsWith('}')
    ) {
      canAcceptDirectives = false
    }

    if (inImportBlock && trimmed === '') continue

    if (canAcceptDirectives && /^['"]use (client|server|strict)['"];?$/.test(trimmed)) {
      directiveLines.push(lines[i])
      continue
    }

    const isReExport =
      /^export\s+(type\s+)?\{[^}]*\}\s+from\s+['"]/.test(trimmed) ||
      /^export\s+\*(\s+as\s+\w+)?\s+from\s+['"]/.test(trimmed)

    if (isReExport) {
      const m = lines[i].match(/from\s+['"]([^'"]+)['"]/)
      if (m) reExportLines.push({ line: lines[i], from: m[1] })
      inImportBlock = true
      canAcceptDirectives = false
      continue
    }

    const isImport = /^import\s/.test(trimmed) || /^import\{/.test(trimmed)

    if (isImport) {
      inImportBlock = true
      canAcceptDirectives = false

      const fromMatch = lines[i].match(/from\s+['"]([^'"]+)['"]/)
      const seMatch = lines[i].match(/^import\s+['"]([^'"]+)['"]/)
      const from = fromMatch ? fromMatch[1] : seMatch ? seMatch[1] : null

      if (!from) {
        nonImportLines.push(lines[i])
        continue
      }

      const isTypeOnly = /^import\s+type\b/.test(trimmed)
      const isInternal = from.startsWith('.') || from.startsWith('@/')
      const isReactEntry = !isTypeOnly && (from === 'react' || from.startsWith('react/'))

      if (isReactEntry) {
        reactFirstLine.push(lines[i])
      } else if (isInternal) {
        internalLines.push({ line: lines[i], from })
      } else {
        externalLines.push({ line: lines[i], from })
      }
      continue
    }

    inImportBlock = false
    nonImportLines.push(lines[i])
  }

  if (reactFirstLine.length === 0 && externalLines.length === 0 && internalLines.length === 0 && reExportLines.length === 0) {
    return null
  }

  const byLengthDesc = (a: TImportItem, b: TImportItem) =>
    b.line.length !== a.line.length ? b.line.length - a.line.length : a.line.localeCompare(b.line)

  externalLines.sort(byLengthDesc)
  internalLines.sort(byLengthDesc)
  reExportLines.sort(byLengthDesc)

  const blocks: string[] = []

  if (directiveLines.length > 0) blocks.push(directiveLines.join('\n'))

  const externalBlock = [...reactFirstLine, ...externalLines.map(i => i.line)]
  if (externalBlock.length > 0) {
    if (blocks.length > 0) blocks.push('')
    blocks.push(externalBlock.join('\n'))
  }

  if (internalLines.length > 0) {
    if (blocks.length > 0) blocks.push('')
    blocks.push(internalLines.map(i => i.line).join('\n'))
  }

  if (reExportLines.length > 0) {
    if (blocks.length > 0) blocks.push('')
    blocks.push(reExportLines.map(i => i.line).join('\n'))
  }

  const rest = nonImportLines.join('\n').replace(/^\n+/, '')

  let newContent: string
  if (blocks.length > 0 && rest.length > 0) {
    newContent = blocks.join('\n') + '\n\n\n' + rest
  } else if (blocks.length > 0) {
    newContent = blocks.join('\n') + '\n'
  } else {
    newContent = rest
  }

  return newContent
}
