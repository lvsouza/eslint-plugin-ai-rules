import type { Rule } from 'eslint'

import type { IAiRulesSettings, IResolvedProject } from '../types/structure'
import { hasStructureRules } from '../structures/hasStructureRules'


let hasWarned = false

function isConfiguredProject(project: IResolvedProject): boolean {
  if (project.relations) return true

  if (
    project.preset === 'frontend' ||
    project.preset === 'backend' ||
    project.preset === 'other'
  ) {
    return true
  }

  return Boolean(project.structure && hasStructureRules(project.structure))
}

function warnOnce(): void {
  if (hasWarned) return
  if (
    process.env.AI_RULES_SILENT === '1' ||
    process.env.AI_RULES_SILENT === 'true'
  ) {
    return
  }

  hasWarned = true
  console.warn(
    [
      '[eslint-plugin-ai-rules] Project structure validation is not configured.',
      "Configure it with aiRules.configs.projects([{ rootFolder: '.', preset: 'frontend' | 'backend' }]).",
      "If this project is not a frontend/backend, use preset: 'other' to disable this warning.",
    ].join('\n'),
  )
}

export const projectSetup: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Warn when the project structure validation is not configured',
    },
    schema: [],
    messages: {},
  },
  create(context) {
    return {
      Program() {
        const settings = context.settings['ai-rules'] as IAiRulesSettings | undefined
        const projects =
          settings?.projects ??
          (settings?.project ? [settings.project] : [])

        if (projects.some(isConfiguredProject)) return

        warnOnce()
      },
    }
  },
}
