import type { Rule } from 'eslint'

import type { IAiRulesSettings, IResolvedProject } from '@/types/structure'
import { hasStructureRules } from '@/structures/hasStructureRules'


let hasReported = false

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

function shouldReportOnce(): boolean {
  if (hasReported) return false
  if (
    process.env.AI_RULES_SILENT === '1' ||
    process.env.AI_RULES_SILENT === 'true'
  ) {
    return false
  }

  hasReported = true

  return true
}

export const projectSetup: Rule.RuleModule = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require project structure validation to be configured',
      recommended: true,
      url: 'https://github.com/lvsouza/eslint-ai-guard/blob/main/README.md#ai-rulesproject-setup',
    },
    schema: [],
    messages: {
      notConfigured:
        'Project structure validation is not configured. Configure it with aiRules.configs.projects([{ rootFolder: ".", preset: "frontend" | "backend" }]). If this project is not a frontend/backend, use preset: "other" to disable this warning.',
    },
  },
  create(context) {
    return {
      Program(node) {
        const settings = context.settings['ai-rules'] as IAiRulesSettings | undefined
        const projects =
          settings?.projects ??
          (settings?.project ? [settings.project] : [])

        if (projects.some(isConfiguredProject)) return
        if (!shouldReportOnce()) return

        context.report({
          node,
          messageId: 'notConfigured',
        })
      },
    }
  },
}
