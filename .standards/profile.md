# Project profile

<!-- Owned by this project. The build-protocol installer creates it once and never overwrites it.
     It sits above the standards and below the user's own words (build-protocol SKILL.md §2).
     Replace every TODO. A value of "none" means the project has no such thing. Say so, never guess.
     Allowed values are listed in each comment. Anything else is read as free text. -->

## Project
- name: TheMan
- type: mixed
  <!-- web-server | web-client | game | cli | library | desktop | mobile | scripts | mixed -->
- components:
  - src/components/: web-client
  - src/world/: game
- languages: typescript
- mode: existing
  <!-- existing: lines changed in old files keep that file's style; new files follow the standards.
       greenfield: all code follows the standards. -->

## Communication
- chat-language: hebrew
  <!-- language for plans, questions and reports -->
- code-language: english
  <!-- identifiers, comments, log messages, commit messages -->
- ui-strings: english
  <!-- english | localized: <where the translation files live>. Localized UI text may be in any language,
       but only inside those files, never inline in code. -->

## Commands
<!-- Exact commands, runnable from the repository root. -->
- install: npm install
- test: npx.cmd tsx --test src/world/terrainMath.test.ts
- test-one: npx.cmd tsx --test
  <!-- how to run a single test file or test name, e.g. "npx vitest run <file>" -->
- lint: npm run lint
- typecheck: npm run lint
- build: npm run build
- run: npm run dev -> http://localhost:3000
  <!-- how to start the app; for a web app add the URL, e.g. "npm run dev -> http://localhost:5173" -->
- full-check: npx.cmd tsx --test src/world/terrainMath.test.ts
  <!-- the one command that must pass before every commit -->

## Verification
- ui-check: browser preview 'dev'
  <!-- how to see UI changes: e.g. "browser preview 'dev'", "run the desktop build", none -->
- perf-check: none
  <!-- how to measure performance: a benchmark command, a profiler recipe, or none -->

## Git
- branch-policy: current
  <!-- current: commit on the branch you are on | branches: new <type>/<desc> branch per task -->
- commit-format: conventional
  <!-- conventional | a pattern, e.g. "<area>: <what> - <why>" -->
- commit-cadence: per-approved-part
  <!-- per-approved-part | per-task (one commit at the end) | none (never commit; leave changes for the user) -->
- push: on-request
  <!-- on-request | never -->

## Style
- doc-density: public-api
  <!-- public-api: full Summary/Design/@tags on exported API, one-line Summary elsewhere
       full: full blocks on everything
       minimal: comments only where the "why" is not obvious -->
- file-banner: yes
  <!-- yes | no -->
- section-headers: yes
  <!-- yes | no (headers are never required in files under the threshold in standards/glossary.md) -->
- regions: auto
  <!-- auto: only in languages with editor folding support (standards/applicability.md) | yes | no -->

## Applicable standards
<!-- auto: use the matrix in build-protocol standards/applicability.md for this project's type.
     Or override per standard: yes | no | partial: <section ids that apply> -->
- code-style: auto
- architecture: auto
- testing: auto
- errors-logging: auto
- security: auto
- git: auto

## Overrides
<!-- Numbers and rules that differ from the standards' defaults. One line each, with the reason.
     Example: - security/anti-dos max-page-size: 500 (admin export needs it) -->
- architecture/hot-path: 60 FPS animation loop and per-tick physics updates in src/world/systems/

## Protected paths
<!-- Changes here are High risk and need explicit approval (contract C6). One glob per line. -->
- none

## Prerequisites and known traps
<!-- Things that make checks fail for reasons unrelated to the change, and how to avoid them. -->
- PowerShell ExecutionPolicy restricts running npm/npx ps1 scripts; invoke npx.cmd or npm.cmd in powershell sessions.
