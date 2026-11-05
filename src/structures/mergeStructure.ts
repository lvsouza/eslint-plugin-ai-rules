import type { INameRule, IProjectStructure, IStructureNode, TFileRule, } from '@/types/structure'


function cloneFileRule(rule: TFileRule): TFileRule {
  if (typeof rule === 'string') return rule

  return {
    ...rule,
    extensions: [...rule.extensions],
  }
}

function mergeNameRule(
  base?: INameRule,
  override?: INameRule,
): INameRule | undefined {
  if (!base && !override) return undefined

  return {
    ...(base ?? {}),
    ...(override ?? {}),
  }
}

function combineFiles(node: IStructureNode): TFileRule[] {
  return [...(node.files ?? []), ...(node.additionalFiles ?? [])]
}

function mergeFolders(
  base?: Record<string, IStructureNode>,
  override?: Record<string, IStructureNode>,
): Record<string, IStructureNode> | undefined {
  if (!base && !override) return undefined

  const result: Record<string, IStructureNode> = {}
  const folderNames = new Set([
    ...Object.keys(base ?? {}),
    ...Object.keys(override ?? {}),
  ])

  for (const folderName of folderNames) {
    result[folderName] = mergeNode(
      base?.[folderName] ?? {},
      override?.[folderName] ?? {},
    )
  }

  return result
}

function mergeNode(base: IStructureNode, override: IStructureNode): IStructureNode {
  const node: IStructureNode = {}
  const baseHasFileConfig =
    base.files !== undefined || base.additionalFiles !== undefined
  const overrideHasFileConfig =
    override.files !== undefined || override.additionalFiles !== undefined

  if (overrideHasFileConfig) {
    const selectedFiles =
      override.files !== undefined ? override.files : combineFiles(base)

    node.files = [
      ...selectedFiles,
      ...(override.additionalFiles ?? []),
    ].map(cloneFileRule)
  } else if (baseHasFileConfig) {
    node.files = combineFiles(base).map(cloneFileRule)
  }

  const name = mergeNameRule(base.name, override.name)
  if (name) node.name = name

  if (override.ignore !== undefined) {
    node.ignore = override.ignore
  } else if (base.ignore !== undefined) {
    node.ignore = base.ignore
  }

  const folders = mergeFolders(base.folders, override.folders)
  if (folders) node.folders = folders

  return node
}

export function mergeStructure(
  base?: IProjectStructure,
  override?: IProjectStructure,
): IProjectStructure {
  const merged: IProjectStructure = mergeNode(base ?? {}, override ?? {})
  const ignoredPaths = Array.from(new Set([
    ...(base?.ignoredPaths ?? []),
    ...(override?.ignoredPaths ?? []),
  ]))

  if (ignoredPaths.length > 0) {
    merged.ignoredPaths = ignoredPaths
  }

  return merged
}
