import type { IProjectStructure } from '../types/structure'


export function hasStructureRules(structure: IProjectStructure): boolean {
  return (
    structure.ignore !== undefined ||
    structure.name !== undefined ||
    structure.files !== undefined ||
    structure.additionalFiles !== undefined ||
    structure.folders !== undefined
  )
}
