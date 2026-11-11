import { resolve } from 'eslint-plugin-import-x/utils'
import type { Rule } from 'eslint'
import path from 'node:path'

import type { IAiRulesSettings } from '@/types/structure'


const ROUTE_GROUP_PATTERN = /^\(.+\)$/
const INTERCEPTING_PATTERN = /^(?:\(\.{1,3}\))+(.+)$/
const DYNAMIC_SEGMENT_PATTERN = /^\[/
const PARALLEL_SEGMENT_PATTERN = /^@/
const PRIVATE_SEGMENT_PATTERN = /^_/
const APP_PREFIX = 'src/app/'
const SHARED_PAGES_PREFIX = 'src/shared/pages/'

function getPhysicalFilename(context: Rule.RuleContext): string {
  return (
    (context as unknown as { getPhysicalFilename?: () => string })
      .getPhysicalFilename?.() ??
    (context as unknown as { physicalFilename?: string }).physicalFilename ??
    context.filename ??
    ''
  )
}

function normalizePath(value: string): string {
  return value.split(path.sep).join('/')
}

function getAppPageName(relativePath: string): string | undefined {
  if (!relativePath.startsWith(APP_PREFIX)) return undefined

  const segments = relativePath.slice(APP_PREFIX.length).split('/')
  segments.pop()

  for (const segment of segments) {
    if (
      PARALLEL_SEGMENT_PATTERN.test(segment) ||
      PRIVATE_SEGMENT_PATTERN.test(segment) ||
      DYNAMIC_SEGMENT_PATTERN.test(segment)
    ) {
      continue
    }

    const intercepting = segment.match(INTERCEPTING_PATTERN)

    if (intercepting) return intercepting[1]

    if (ROUTE_GROUP_PATTERN.test(segment)) continue

    return segment
  }

  return undefined
}

function getSharedPageName(relativePath: string): string | undefined {
  if (!relativePath.startsWith(SHARED_PAGES_PREFIX)) return undefined

  return relativePath.slice(SHARED_PAGES_PREFIX.length).split('/')[0]
}

export const appPageScope: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow app route imports from other shared pages',
      recommended: false,
      url: 'https://github.com/lvsouza/eslint-ai-guard/blob/main/README.md#ai-rulesapp-page-scope',
    },
    schema: [],
    messages: {
      crossPage:
        'Import from page "{{targetPage}}" is not allowed inside app route "{{appPage}}".',
    },
  },
  create(context) {
    const settings = context.settings['ai-rules'] as IAiRulesSettings | undefined
    const project =
      settings?.project ??
      settings?.projects?.[0]

    if (!project) return {}

    const cwd = process.cwd()
    const rootAbsolutePath = path.resolve(cwd, project.rootFolder)
    const physicalFilename = getPhysicalFilename(context)

    if (
      !physicalFilename ||
      physicalFilename === '<input>' ||
      physicalFilename === '<text>'
    ) {
      return {}
    }

    const fileAbsolutePath = path.resolve(cwd, physicalFilename)
    const relativePath = normalizePath(
      path.relative(rootAbsolutePath, fileAbsolutePath),
    )
    const appPage = getAppPageName(relativePath)

    if (!appPage) return {}

    function checkImport(
      sourceNode: { value?: unknown },
      reportNode: Rule.Node,
    ): void {
      if (typeof sourceNode.value !== 'string') return

      const resolved = resolve(
        sourceNode.value,
        context as unknown as Parameters<typeof resolve>[1],
      )

      if (!resolved) return

      const targetRelativePath = normalizePath(
        path.relative(rootAbsolutePath, resolved),
      )
      const targetPage = getSharedPageName(targetRelativePath)

      if (!targetPage || targetPage === appPage) return

      context.report({
        node: reportNode,
        messageId: 'crossPage',
        data: {
          appPage,
          targetPage,
        },
      })
    }

    return {
      ImportDeclaration(node) {
        checkImport(node.source, node)
      },
      ExportNamedDeclaration(node) {
        if (node.source) checkImport(node.source, node)
      },
      ExportAllDeclaration(node) {
        checkImport(node.source, node)
      },
      ImportExpression(node) {
        if (node.source.type === 'Literal') {
          checkImport(node.source as { value?: unknown }, node)
        }
      },
    }
  },
}
