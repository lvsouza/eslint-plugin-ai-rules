import type { IProjectPreset, IStructureNode, TFileRule } from '@/types/structure'
import { frontendPreset, frontendRelations } from './frontend'
import { mergeStructure } from '@/structures/mergeStructure'


const NEXT_APP_ROUTE_DEPTH = 10

const nextAppFiles: TFileRule[] = [
  'layout.tsx',
  'page.tsx',
  'loading.tsx',
  'error.tsx',
  'global-error.tsx',
  'not-found.tsx',
  'template.tsx',
  'default.tsx',
  'forbidden.tsx',
  'unauthorized.tsx',
  'route.ts',
  'sitemap.ts',
  'robots.ts',
  'manifest.ts',
  'opengraph-image.{tsx,jpg,jpeg,png,gif}',
  'twitter-image.{tsx,jpg,jpeg,png,gif}',
  'icon.{tsx,ico,jpg,jpeg,png,svg}',
  'apple-icon.{tsx,jpg,jpeg,png}',
  'favicon.ico',
  'globals.css',
  'providers.tsx',
]

function nextAppRouteNode(depth: number): IStructureNode {
  if (depth <= 0) return { ignore: true }

  return {
    files: nextAppFiles,
    folders: {
      '[route]': nextAppRouteNode(depth - 1),
    },
  }
}

const nextAppNode: IStructureNode = {
  files: nextAppFiles,
  folders: {
    '[route]': nextAppRouteNode(NEXT_APP_ROUTE_DEPTH),
  },
}

const nextjsStructure = mergeStructure(frontendPreset.structure, {
  folders: {
    src: {
      additionalFiles: ['middleware.ts', 'instrumentation.ts'],
      folders: {
        app: nextAppNode,
      },
    },
  },
})

export const nextjsPreset: IProjectPreset = {
  structure: nextjsStructure,
  relations: frontendRelations,
}
