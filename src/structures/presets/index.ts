import type { IProjectPreset, TProjectPreset } from '@/types/structure'
import { frontendPreset } from './frontend'
import { backendPreset } from './backend'
import { nextjsPreset } from './nextjs'
import { otherPreset } from './other'


export const presets: Record<TProjectPreset, IProjectPreset> = {
  frontend: frontendPreset,
  nextjs: nextjsPreset,
  backend: backendPreset,
  other: otherPreset,
}

export function getPreset(preset: TProjectPreset): IProjectPreset {
  const value = presets[preset]

  if (!value) {
    throw new Error(
      `Unknown preset "${preset}". Expected one of: ${Object.keys(presets).join(', ')}.`,
    )
  }

  return value
}
