import assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  groupCommits,
  parseCommit,
  renderReleaseNotes,
} from '../scripts/GenerateReleaseNotes.mjs'

const repository = 'owner/repo'

function hash(character) {
  return character.repeat(40)
}

function shortHash(character) {
  return character.repeat(7)
}

test('parseCommit extracts conventional commit metadata', () => {
  assert.deepEqual(
    parseCommit({
      hash: hash('a'),
      subject: 'feat(api): add pagination',
    }),
    {
      hash: hash('a'),
      subject: 'add pagination',
      scope: 'api',
      type: 'feat',
      group: 'features',
    },
  )
})

test('renderReleaseNotes groups commits by conventional type', () => {
  const notes = renderReleaseNotes({
    commits: [
      { hash: hash('a'), subject: 'feat(app): add nextjs preset' },
      { hash: hash('b'), subject: 'fix: handle missing config' },
      { hash: hash('c'), subject: 'chore: bump version' },
      { hash: hash('d'), subject: 'Update docs' },
      { hash: hash('e'), subject: 'feat!: remove legacy API' },
      {
        hash: hash('f'),
        subject: 'refactor: split module',
        body: 'BREAKING CHANGE: changes the public exports',
      },
      { hash: hash('1'), subject: 'docs: document release flow' },
      { hash: hash('2'), subject: 'test: cover release notes' },
      { hash: hash('3'), subject: 'perf: cache lookups' },
    ],
    currentTag: 'v1.1.0',
    previousTag: 'v1.0.0',
    repository,
  })

  assert.match(notes, /^## What was changed/m)
  assert.match(notes, /### Breaking Changes/)
  assert.match(notes, /### Features/)
  assert.match(notes, /### Bug Fixes/)
  assert.match(notes, /### Performance/)
  assert.match(notes, /### Documentation/)
  assert.match(notes, /### Tests/)
  assert.match(notes, /### Maintenance/)
  assert.match(notes, /### Other Changes/)

  assert.ok(
    notes.indexOf('### Breaking Changes') < notes.indexOf('### Features'),
  )
  assert.match(
    notes,
    new RegExp(
      `- remove legacy API \\(\\[${shortHash('e')}\\]\\(https://github\\.com/${repository}/commit/${hash('e')}\\)\\)`,
    ),
  )
  assert.match(
    notes,
    new RegExp(
      `- split module \\(\\[${shortHash('f')}\\]\\(https://github\\.com/${repository}/commit/${hash('f')}\\)\\)`,
    ),
  )
  assert.match(notes, /- \*\*app:\*\* add nextjs preset/)
  assert.match(notes, /- handle missing config/)
  assert.match(notes, /- cache lookups/)
  assert.match(notes, /- document release flow/)
  assert.match(notes, /- cover release notes/)
  assert.match(notes, /- bump version/)
  assert.match(notes, /- Update docs/)
  assert.doesNotMatch(notes, /### Refactoring/)
  assert.match(
    notes,
    new RegExp(
      `\\*\\*Full Changelog\\*\\*: https://github\\.com/${repository}/compare/v1\\.0\\.0\\.\\.\\.v1\\.1\\.0`,
    ),
  )
})

test('renderReleaseNotes omits the compare link on the first release', () => {
  const notes = renderReleaseNotes({
    commits: [{ hash: hash('a'), subject: 'feat: initial release' }],
    currentTag: 'v1.0.0',
    previousTag: undefined,
    repository,
  })

  assert.match(notes, /### Features/)
  assert.doesNotMatch(notes, /Full Changelog/)
})

test('renderReleaseNotes falls back to plain hashes without a repository', () => {
  const notes = renderReleaseNotes({
    commits: [{ hash: hash('a'), subject: 'fix: avoid crash' }],
    currentTag: 'v1.0.0',
    previousTag: undefined,
    repository: undefined,
  })

  assert.match(notes, new RegExp(`- avoid crash \\(${shortHash('a')}\\)`))
  assert.doesNotMatch(notes, /https:\/\/github\.com/)
})

test('renderReleaseNotes handles empty commit lists', () => {
  const notes = renderReleaseNotes({
    commits: [],
    currentTag: 'v1.0.0',
    previousTag: undefined,
    repository,
  })

  assert.equal(notes, '## What was changed\n\nNo commits found for this release.\n')
  assert.deepEqual(groupCommits([]), [])
})
