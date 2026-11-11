import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const CONVENTIONAL_COMMIT_PATTERN =
  /^(?<type>[a-zA-Z]+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?:\s*(?<subject>.+)$/
const BREAKING_CHANGE_PATTERN = /^BREAKING[ -]CHANGE:/m
const RECORD_SEPARATOR = '\x1e'
const FIELD_SEPARATOR = '\x1f'

const GROUP_ORDER = [
  'breaking',
  'features',
  'fixes',
  'performance',
  'refactoring',
  'documentation',
  'tests',
  'maintenance',
  'other',
]

const GROUP_TITLES = {
  breaking: 'Breaking Changes',
  features: 'Features',
  fixes: 'Bug Fixes',
  performance: 'Performance',
  refactoring: 'Refactoring',
  documentation: 'Documentation',
  tests: 'Tests',
  maintenance: 'Maintenance',
  other: 'Other Changes',
}

const TYPE_GROUPS = {
  feat: 'features',
  fix: 'fixes',
  perf: 'performance',
  refactor: 'refactoring',
  docs: 'documentation',
  test: 'tests',
  build: 'maintenance',
  ci: 'maintenance',
  chore: 'maintenance',
  revert: 'maintenance',
}

export function parseCommit(commit) {
  const match = commit.subject.match(CONVENTIONAL_COMMIT_PATTERN)
  const body = commit.body ?? ''
  const type = match?.groups?.type?.toLowerCase()
  const isBreaking =
    Boolean(match?.groups?.breaking) || BREAKING_CHANGE_PATTERN.test(body)

  return {
    hash: commit.hash,
    subject: match?.groups?.subject?.trim() ?? commit.subject.trim(),
    scope: match?.groups?.scope?.trim(),
    type,
    group: isBreaking ? 'breaking' : (type && TYPE_GROUPS[type]) || 'other',
  }
}

export function groupCommits(commits) {
  const parsed = commits.map(parseCommit)

  return GROUP_ORDER.map((id) => ({
    id,
    title: GROUP_TITLES[id],
    commits: parsed.filter((commit) => commit.group === id),
  })).filter((group) => group.commits.length > 0)
}

function formatCommit(commit, repository) {
  const title = commit.scope
    ? `**${commit.scope}:** ${commit.subject}`
    : commit.subject
  const shortHash = commit.hash.slice(0, 7)
  const reference = repository
    ? `[${shortHash}](https://github.com/${repository}/commit/${commit.hash})`
    : shortHash

  return `- ${title} (${reference})`
}

export function renderReleaseNotes({
  commits,
  currentTag,
  previousTag,
  repository,
}) {
  const groups = groupCommits(commits)
  const lines = ['## What was changed', '']

  if (groups.length === 0) {
    lines.push('No commits found for this release.', '')
  }

  for (const group of groups) {
    lines.push(`### ${group.title}`, '')

    for (const commit of group.commits) {
      lines.push(formatCommit(commit, repository))
    }

    lines.push('')
  }

  if (previousTag && repository) {
    lines.push(
      `**Full Changelog**: https://github.com/${repository}/compare/${previousTag}...${currentTag}`,
      '',
    )
  }

  return `${lines.join('\n').trimEnd()}\n`
}

function findPreviousTag(tag) {
  try {
    return (
      execFileSync(
        'git',
        ['describe', '--tags', '--abbrev=0', '--match', 'v*', `${tag}^`],
        {
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'ignore'],
        },
      ).trim() || undefined
    )
  } catch {
    return undefined
  }
}

function resolveRevision(reference) {
  try {
    return execFileSync(
      'git',
      ['rev-parse', '--verify', `${reference}^{commit}`],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    ).trim()
  } catch {
    return 'HEAD'
  }
}

function readCommits(range) {
  const format = `%H${FIELD_SEPARATOR}%s${FIELD_SEPARATOR}%b${RECORD_SEPARATOR}`
  const output = execFileSync(
    'git',
    ['log', '--no-merges', `--pretty=format:${format}`, range],
    {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  return output
    .split(RECORD_SEPARATOR)
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [hash, subject, body = ''] = record.split(FIELD_SEPARATOR)

      return { hash, subject, body }
    })
}

function parseArgs(args) {
  const options = {}

  for (let index = 0; index < args.length; index++) {
    const arg = args[index]

    if (!arg.startsWith('--')) continue

    const [name, inlineValue] = arg.split('=', 2)
    const value = inlineValue ?? args[index + 1]

    if (inlineValue === undefined) index += 1

    options[name.slice(2)] = value
  }

  return options
}

function main() {
  const options = parseArgs(process.argv.slice(2))
  const tag = options.tag
  const output = options.output

  if (!tag || !output) {
    console.error(
      'Usage: node scripts/GenerateReleaseNotes.mjs --tag <tag> --output <file>',
    )
    process.exitCode = 1
    return
  }

  const repository = options.repository ?? process.env.GITHUB_REPOSITORY
  const previousTag = findPreviousTag(tag)
  const currentRevision = resolveRevision(tag)
  const range = previousTag
    ? `${previousTag}..${currentRevision}`
    : currentRevision
  const commits = readCommits(range)
  const notes = renderReleaseNotes({
    commits,
    currentTag: tag,
    previousTag,
    repository,
  })

  writeFileSync(output, notes)
}

const entryPoint = process.argv[1]

if (entryPoint && import.meta.url === pathToFileURL(entryPoint).href) {
  main()
}
