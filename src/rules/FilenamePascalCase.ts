import type { Rule } from 'eslint'
import path from 'node:path'


interface IFilenamePascalCaseOptions {
  ignore?: Array<string | RegExp>
  ignoreMiddleExtensions?: boolean
}

export const filenamePascalCase: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce PascalCase for file names',
      recommended: true,
      url: 'https://github.com/lvsouza/eslint-ai-guard/blob/main/README.md#ai-rulesfilename-pascal-case',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ignore: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Regex strings matched against the file name and relative path.',
          },
          ignoreMiddleExtensions: {
            type: 'boolean',
            description:
              'Allow middle extensions such as .test in file names.',
          },
        },
        additionalProperties: false,
      },
    ],
    defaultOptions: [{ ignore: [], ignoreMiddleExtensions: true }],
    messages: {
      invalid: 'File name "{{basename}}" must be in PascalCase. Rename to "{{expected}}".',
    },
  },
  create(context) {
    const options = (context.options[0] ?? {}) as IFilenamePascalCaseOptions
    const { ignore = [], ignoreMiddleExtensions = true } = options
    const ignoreMatchers = ignore.flatMap((pattern) => {
      try {
        return [pattern instanceof RegExp ? pattern : new RegExp(pattern)]
      } catch {
        return []
      }
    })

    const physicalFilename =
      // eslint 9 flat config
      (context as unknown as { getPhysicalFilename?: () => string }).getPhysicalFilename?.() ??
      (context as unknown as { physicalFilename?: string }).physicalFilename ??
      context.filename ??
      ''

    const basename = path.basename(physicalFilename)
    const cwd = process.cwd()
    const relativePath = physicalFilename.startsWith(cwd + path.sep)
      ? physicalFilename.slice(cwd.length + 1)
      : physicalFilename

    const isIgnored = ignoreMatchers.some((matcher) =>
      [basename, relativePath].some((target) => {
        matcher.lastIndex = 0
        return matcher.test(target)
      }),
    )

    if (isIgnored) return {}
    if (basename.startsWith('.')) return {}
    if (basename === 'index.ts' || basename === 'index.tsx' || basename === 'index.js' || basename === 'index.jsx') return {}
    if (basename.endsWith('.d.ts')) return {}
    if (basename.endsWith('.css')) return {}

    const extension = basename.match(/\.(ts|tsx|js|jsx)$/)?.[0] ?? ''
    const namePart = extension ? basename.slice(0, -extension.length) : basename
    const baseName = namePart.split('.')[0]

    const toPascalCase = (value: string): string =>
      value
        .split(/[-_]/)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join('')

    const segments = ignoreMiddleExtensions ? [baseName] : namePart.split('.')
    const isValid = segments.every(segment => /^[A-Z][a-zA-Z0-9]*$/.test(segment))

    if (!isValid) {
      const expectedName = ignoreMiddleExtensions
        ? `${toPascalCase(baseName)}${namePart.slice(baseName.length)}`
        : segments.map(toPascalCase).join('.')
      const expected = `${expectedName}${extension}`

      if (expected !== basename) {
        context.report({
          loc: { line: 1, column: 0 },
          messageId: 'invalid',
          data: { basename, expected },
        })
      }
    }

    return {}
  },
}
