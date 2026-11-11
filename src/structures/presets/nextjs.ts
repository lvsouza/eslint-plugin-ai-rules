import type { IProjectPreset, IProjectRulesOverride, IRelationsConfig, IStructureNode, TFileRule } from '@/types/structure'
import { componentGroupNode, configFileDefaultExportOverride, pascalTs, pascalTsx } from './helpers'
import { BUNDLED_RULE_IDS, RULE_IDS } from '@/rules/constants'
import { frontendPreset, frontendRelations } from './frontend'
import { mergeStructure } from '@/structures/mergeStructure'


const NEXT_APP_ROUTE_DEPTH = 10
const NEXT_ROUTE_SEGMENT_PATTERN = [
  '^(?:',
  '[a-z0-9]+(?:-[a-z0-9]+)*',
  '|\\([a-z0-9]+(?:-[a-z0-9]+)*\\)',
  '|@[a-z0-9]+(?:-[a-z0-9]+)*',
  '|(?:\\(\\.{1,3}\\))+(?:[a-z0-9]+(?:-[a-z0-9]+)*|\\[[^\\]]+\\])',
  '|\\[[a-z0-9]+(?:-[a-z0-9]+)*\\]',
  '|\\[\\.\\.\\.[a-z0-9]+(?:-[a-z0-9]+)*\\]',
  '|\\[\\[\\.\\.\\.[a-z0-9]+(?:-[a-z0-9]+)*\\]\\]',
  ')$',
].join('')

const nextAppFiles: TFileRule[] = [
  'layout.tsx',
  'page.tsx',
  'loading.tsx',
  'error.tsx',
  'global-error.tsx',
  'global-not-found.tsx',
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
    name: { pattern: NEXT_ROUTE_SEGMENT_PATTERN },
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

const sharedPageNode: IStructureNode = {
  name: { case: 'kebab-case' },
  files: [pascalTsx, 'helpers.ts', 'schema.ts', 'types.ts'],
  folders: {
    components: {
      files: [pascalTsx],
      folders: {
        '[component-group]': componentGroupNode(),
      },
    },
    hooks: {
      files: [pascalTs],
    },
    services: {
      files: [pascalTs],
    },
    contexts: {
      files: [
        {
          case: 'PascalCase',
          extensions: ['.tsx'],
        },
      ],
    },
    helpers: {
      files: [pascalTs],
    },
  },
}

function extendLayerPaths(
  paths: string | string[],
  addition: string,
): string[] {
  return [...(Array.isArray(paths) ? paths : [paths]), addition]
}

const nextjsRelations: IRelationsConfig = {
  ...frontendRelations,
  layers: {
    ...frontendRelations.layers,
    app: 'src/app',
    pageComponent: extendLayerPaths(
      frontendRelations.layers.pageComponent,
      'src/shared/pages/*/components',
    ),
    pageHook: extendLayerPaths(
      frontendRelations.layers.pageHook,
      'src/shared/pages/*/hooks',
    ),
    pageService: extendLayerPaths(
      frontendRelations.layers.pageService,
      'src/shared/pages/*/services',
    ),
    pageContext: extendLayerPaths(
      frontendRelations.layers.pageContext,
      'src/shared/pages/*/contexts',
    ),
    pageHelper: extendLayerPaths(
      frontendRelations.layers.pageHelper,
      'src/shared/pages/*/helpers',
    ),
    page: extendLayerPaths(
      frontendRelations.layers.page,
      'src/shared/pages/*',
    ),
  },
}

const nextjsDefaultExportOverride: IProjectRulesOverride = {
  files: [
    'src/app/**/page.tsx',
    'src/app/**/layout.tsx',
    'src/app/**/loading.tsx',
    'src/app/**/error.tsx',
    'src/app/**/global-error.tsx',
    'src/app/**/global-not-found.tsx',
    'src/app/**/not-found.tsx',
    'src/app/**/template.tsx',
    'src/app/**/default.tsx',
    'src/app/**/forbidden.tsx',
    'src/app/**/unauthorized.tsx',
    'src/app/**/sitemap.ts',
    'src/app/**/robots.ts',
    'src/app/**/manifest.ts',
    'src/app/**/opengraph-image.tsx',
    'src/app/**/twitter-image.tsx',
    'src/app/**/icon.tsx',
    'src/app/**/apple-icon.tsx',
    'src/middleware.ts',
    'src/proxy.ts',
  ],
  rules: {
    [BUNDLED_RULE_IDS.noDefaultExport]: 'off',
  },
}

const nextjsStructure = mergeStructure(frontendPreset.structure, {
  folders: {
    src: {
      additionalFiles: [
        'middleware.ts',
        'proxy.ts',
        'instrumentation.ts',
        'instrumentation-client.ts',
      ],
      folders: {
        app: nextAppNode,
        shared: {
          folders: {
            pages: {
              folders: {
                '[page]': sharedPageNode,
              },
            },
          },
        },
      },
    },
  },
  ignoredPaths: [
    'next-env.d.ts',
    '.next/**',
    'out/**',
  ],
})

export const nextjsPreset: IProjectPreset = {
  structure: nextjsStructure,
  relations: nextjsRelations,
  rules: {
    [RULE_IDS.appPageScope]: 'error',
  },
  overrides: [
    configFileDefaultExportOverride,
    nextjsDefaultExportOverride,
  ],
}
