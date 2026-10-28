# Git

How changes enter history. *When* to commit, and the approval each commit needs, is the
protocol's job (build-protocol `workflow/lifecycle.md` and contract C2). This file covers
*how*. The profile's Git section chooses between the options below.

## branches — Branches

| Profile `branch-policy` | Rule |
|---|---|
| `current` (default) | Commit on the branch you are on. Do not create, switch or delete branches unless asked. |
| `branches` | One short-lived branch per task, from the up-to-date default branch, named `<type>/<short-kebab-description>`, e.g. `fix/expired-room-key-rejection`. Types are listed in `commit-format`. |

Never commit to a branch the user did not expect. If you are unsure which branch you are on, check it before the first commit.

## commit-format — Commit messages

The profile's `commit-format` is either `conventional` or a pattern. With a pattern, follow it exactly, and copy the style of the last commits in `git log`.

With `conventional`:

```
<type>(<scope>): <imperative summary, at most 72 characters>

<body: why the change was made and any decision a reviewer needs; wrap at 72>

<footer: issue references, BREAKING CHANGE: ...>
```

- **type:** `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `chore`, `build`, `ci`. Security hardening uses `fix` or `feat` with scope `security`.
- **scope:** the Room or module.
- **Summary:** imperative mood ("add", not "added"). No trailing period.

In every format:
- The message is in `code-language`.
- The body says *why*. The diff already says *what*.
- End with the attribution lines your environment requires, if any.
- On Windows, pass a multi-line message from a file (`git commit -F <file>`). Never use multiple `-m` flags with escaped newlines.

## atomic-commits — One change per commit

- A commit is one logical change and leaves the project building and its checks passing (`full-check`).
- Never mix a mechanical change (formatting, rename, move) with a logic change. Each gets its own commit.
- Never commit with hooks skipped (`--no-verify`) or signing bypassed. If a hook fails, fix the cause (contract C5).
- Stage specific files, not `git add -A`, unless you have checked `git status` and every file belongs.

## hygiene — What never gets committed

- Secrets and environment files (`security.md`, `secrets-config`).
- Build output and dependencies: `node_modules/`, `dist/`, `build/`, `bin/`, `obj/`, `target/`, `__pycache__/`, `.venv/`.
- Editor and OS noise: `.DS_Store`, `Thumbs.db`, personal editor settings.
- **Commented-out code.** History keeps old code. Delete it.
- Debug leftovers: stray `console.log` or `print`, `debugger`, focused or skipped tests (`it.only`, `xit`).
- Large binaries, unless the project tracks them (for example with Git LFS, as its profile says).
