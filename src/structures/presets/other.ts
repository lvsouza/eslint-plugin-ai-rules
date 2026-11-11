import { configFileDefaultExportOverride } from './helpers'
import type { IProjectPreset } from '@/types/structure'


export const otherPreset: IProjectPreset = {
  structure: {},
  overrides: [configFileDefaultExportOverride],
}
