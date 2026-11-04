import type { Rule } from 'eslint'
import path from 'node:path'

import { describeFileRule, fileRuleMatchesExtension, matchesFileRule, } from '../utils/matchFileRule'
import type { IAiRulesSettings, IResolvedProject, IStructureNode, } from '../types/structure'
import { describeNameRule, matchesNameRule } from '../utils/matchNameRule'
import { matchPathPattern } from '../utils/matchPathPattern'


const DYNAMIC_FOLDER_PATTERN = /^\[.+\]$/

type TFolderNotAllowed = {
  messageId: 'folderNotAllowed'
  data: { folder: string; parent: string; allowed: string }
}

type TFolderNameMismatch = {
  messageId: 'folderNameMismatch'
  data: { folder: string; parent: string; expected: string }
}

type TFileNotAllowed = {
  messageId: 'fileNotAllowed'
  data: { file: string; parent: string; allowed: string }
}

type TFileNameMismatch = {
  messageId: 'fileNameMismatch'
  data: { file: string; parent: string; expected: string }
}

type TViolation =
  | TFolderNotAllowed
  | TFolderNameMismatch
  | TFileNotAllowed
  | TFileNameMismatch

type TFolderMatch = {
  node?: IStructureNode
  mismatch?: string
}

function getFileRules(node: IStructureNode) {
  return [...(node.files ?? []), ...(node.additionalFiles ?? [])]
}

function describeAllowedFolders(node: IStructureNode): string {
  const entries = Object.entries(node.folders ?? {})

  if (entries.length === 0) return 'none'

  return entries
    .map(([folderName, child]) => {
      if (!DYNAMIC_FOLDER_PATTERN.test(folderName)) return folderName
      if (!child.name) return folderName

      return `${folderName} (${describeNameRule(child.name)})`
    })
    .join(', ')
}

function describeAllowedFiles(node: IStructureNode): string {
  const rules = getFileRules(node)

  if (rules.length === 0) return 'none'

  return rules.map(describeFileRule).join(', ')
}

function matchFolder(node: IStructureNode, segment: string): TFolderMatch {
  let dynamicFolder:
    | { name: string; child: IStructureNode }
    | undefined

  for (const [folderName, child] of Object.entries(node.folders ?? {})) {
    if (folderName === segment) return { node: child }

    if (!dynamicFolder && DYNAMIC_FOLDER_PATTERN.test(folderName)) {
      dynamicFolder = { name: folderName, child }
    }
  }

  if (!dynamicFolder) return {}

  if (!dynamicFolder.child.name) return { node: dynamicFolder.child }

  if (matchesNameRule(segment, dynamicFolder.child.name)) {
    return { node: dynamicFolder.child }
  }

  return { mismatch: describeNameRule(dynamicFolder.child.name) }
}

function findViolation(
  relativePath: string,
  structure: IStructureNode,
): TViolation | null {
  const segments = relativePath.split('/').filter(Boolean)
  let current = structure
  const consumed: string[] = []

  for (let index = 0; index < segments.length; index++) {
    const segment = segments[index]
    const isFile = index === segments.length - 1
    const parent = consumed.length > 0 ? consumed.join('/') : '.'

    if (isFile) {
      const rules = getFileRules(current)

      if (rules.some((rule) => matchesFileRule(segment, rule))) return null

      const matchingExtensionRules = rules.filter((rule) =>
        fileRuleMatchesExtension(segment, rule),
      )

      if (matchingExtensionRules.length > 0) {
        return {
          messageId: 'fileNameMismatch',
          data: {
            file: segment,
            parent,
            expected: matchingExtensionRules.map(describeFileRule).join(', '),
          },
        }
      }

      return {
        messageId: 'fileNotAllowed',
        data: {
          file: segment,
          parent,
          allowed: describeAllowedFiles(current),
        },
      }
    }

    const folderMatch = matchFolder(current, segment)

    if (folderMatch.node) {
      if (folderMatch.node.ignore) return null

      current = folderMatch.node
      consumed.push(segment)
      continue
    }

    if (folderMatch.mismatch) {
      return {
        messageId: 'folderNameMismatch',
        data: {
          folder: segment,
          parent,
          expected: folderMatch.mismatch,
        },
      }
    }

    return {
      messageId: 'folderNotAllowed',
      data: {
        folder: segment,
        parent,
        allowed: describeAllowedFolders(current),
      },
    }
  }

  return null
}

function findProject(
  projects: IResolvedProject[],
  fileAbsolutePath: string,
  cwd: string,
): IResolvedProject | undefined {
  let matchedProject: IResolvedProject | undefined
  let matchedRootLength = -1

  for (const project of projects) {
    const rootAbsolutePath = path.resolve(cwd, project.rootFolder)
    const relativePath = path.relative(rootAbsolutePath, fileAbsolutePath)

    if (
      relativePath.length === 0 ||
      relativePath.startsWith('..') ||
      path.isAbsolute(relativePath)
    ) {
      continue
    }

    if (rootAbsolutePath.length > matchedRootLength) {
      matchedProject = project
      matchedRootLength = rootAbsolutePath.length
    }
  }

  return matchedProject
}

function getPhysicalFilename(context: Rule.RuleContext): string {
  return (
    (context as unknown as { getPhysicalFilename?: () => string })
      .getPhysicalFilename?.() ??
    (context as unknown as { physicalFilename?: string }).physicalFilename ??
    context.filename ??
    ''
  )
}

export const projectStructure: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce the configured project folder and file structure',
      recommended: false,
      url: 'https://github.com/lvsouza/eslint-ai-guard/blob/main/README.md#ai-rulesproject-structure',
    },
    schema: [],
    messages: {
      folderNotAllowed:
        'Folder "{{folder}}" is not allowed inside "{{parent}}". Allowed folders: {{allowed}}.',
      folderNameMismatch:
        'Folder "{{folder}}" inside "{{parent}}" must match {{expected}}.',
      fileNotAllowed:
        'File "{{file}}" is not allowed inside "{{parent}}". Allowed files: {{allowed}}.',
      fileNameMismatch:
        'File "{{file}}" inside "{{parent}}" must match {{expected}}.',
    },
  },
  create(context) {
    const settings = context.settings['ai-rules'] as IAiRulesSettings | undefined
    const projects =
      settings?.projects ??
      (settings?.project ? [settings.project] : [])

    if (projects.length === 0) return {}

    return {
      Program(node) {
        const physicalFilename = getPhysicalFilename(context)

        if (
          !physicalFilename ||
          physicalFilename === '<input>' ||
          physicalFilename === '<text>'
        ) {
          return
        }

        const cwd = process.cwd()
        const fileAbsolutePath = path.resolve(cwd, physicalFilename)
        const project = findProject(projects, fileAbsolutePath, cwd)

        if (!project || !project.structure) return

        const rootAbsolutePath = path.resolve(cwd, project.rootFolder)
        const relativePath = path
          .relative(rootAbsolutePath, fileAbsolutePath)
          .split(path.sep)
          .join('/')

        if (
          relativePath.length === 0 ||
          project.structure.ignore ||
          (project.structure.ignoredPaths ?? []).some((pattern) =>
            matchPathPattern(relativePath, pattern),
          )
        ) {
          return
        }

        const violation = findViolation(relativePath, project.structure)

        if (!violation) return

        switch (violation.messageId) {
          case 'folderNotAllowed':
            context.report({
              node,
              messageId: 'folderNotAllowed',
              data: violation.data,
            })
            break
          case 'folderNameMismatch':
            context.report({
              node,
              messageId: 'folderNameMismatch',
              data: violation.data,
            })
            break
          case 'fileNotAllowed':
            context.report({
              node,
              messageId: 'fileNotAllowed',
              data: violation.data,
            })
            break
          case 'fileNameMismatch':
            context.report({
              node,
              messageId: 'fileNameMismatch',
              data: violation.data,
            })
            break
        }
      },
    }
  },
}
