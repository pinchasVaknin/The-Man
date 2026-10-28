# Code style

How a source file looks. In a project with `mode: existing`, this applies to new files only.
Lines you change inside an old file follow that file's style (see build-protocol `SKILL.md` §3).
Language-specific syntax is in `applicability.md`, *Language adaptations*. A complete file in
TypeScript and in Python is in build-protocol `golden/`.

## language — Code language

- Identifiers, comments, doc blocks, log messages, error codes and commit messages are written in the profile's `code-language` (default English).
- User-facing UI text follows `i18n` below. It is the only place another language may appear.

## file-banner — File banner

When the profile has `file-banner: yes`, every source file starts with:

```ts
// ============================================================================
// MODULE: Security / Access Control
// DESIGN: Strategy dispatch + guarded room (SRP, DIP)
// SUMMARY: Grants entry to a room after verifying the caller's room-scoped key.
//          Does not authenticate callers; that happens at the boundary.
// ============================================================================
```

- **MODULE**: the Room or layer the file belongs to.
- **DESIGN**: the patterns and decisions a reader needs to know before changing the file.
- **SUMMARY**: 1–3 sentences. What the file is responsible for, and what it is explicitly *not* responsible for.
- No `FILE:` line. The file name is already the file name, and a copy of it goes stale on the first rename.
- Generated files carry the generator's banner instead.

## section-headers — Section headers

When the profile has `section-headers: yes` and the file is not a small file (`glossary.md`), each logical group starts with a header:

```ts
// ======================== PUBLIC ROOM ACCESS ======================== \\
```

- **Exactly 24 `=` on each side.** One space between the `=` runs and the title.
- The title is in ALL CAPS.
- The line opens with the language's line comment. It closes with `\\` in TypeScript, JavaScript, C# and Java, `#` in Python, and `//` in C, C++, Go and Rust. **A `//` line must never end with a backslash in C or C++** (`applicability.md`, note 12).
- Usual titles, in file order: `IMPORTS & DEPENDENCIES`, `CONSTANTS & TYPES`, `CLASS DEFINITION & STATE`, `CONSTRUCTOR & INITIALIZATION`, `PUBLIC <CAPABILITY>`, `PRIVATE HELPERS`.

## regions — Regions

When regions are on (`regions: yes`, or `auto` in a language that supports folding):

- Inside a section, wrap each public capability and each helper group in a region.
- Region names are descriptive English with **no numbering**: `// #region Request Room Entry`, never `// #region 1. Request Room Entry`.
- Regions are used only in files that have section headers.
- Syntax per language: `applicability.md`.

## doc-blocks — Documentation blocks

The profile's `doc-density` decides how much each declaration gets:

| Declaration | `public-api` (default) | `full` | `minimal` |
|---|---|---|---|
| Exported class, interface, type | Summary + Design | Summary + Design | Summary when not obvious |
| Exported function or method | Summary, Design, `@param`, `@returns`, `@throws` | same | Summary when not obvious |
| Private or internal function | One-line Summary | full block | — |
| Field, constant | Summary only when the name and type do not say it (units, ranges, why this value) | Summary | — |
| Test | One-line Summary when the test name is not enough | Summary + Design | — |

Rules for every block:

- **Summary** says *what* and, where relevant, *what it does not do*. **Design** says *how and why*: the pattern, the trade-off, the reason a simpler way was not used.
- `@param` documents each parameter. A function without parameters has no `@param` line.
- `@returns` says what success and failure look like (for example "`Result.ok` with the token, or `Result.fail('ROOM_ACCESS_DENIED')`").
- `@throws` lists every exception type the function can throw, with the condition. A function that throws nothing has no `@throws` line.
- Units go in the name or the Summary: `timeoutMs`, "in seconds".
- Inline comments explain *why*, never restate *what*. Phase comments (`// Guard clauses`, `// Persist`) are welcome in functions longer than about 20 lines.

## naming — Naming

| Element | Convention | Example |
|---|---|---|
| Classes, interfaces, types, enums | `PascalCase`. Interface prefix `I` only where `applicability.md` says ✔ | `VaultAccessService`, `IPermissionRepository` |
| Functions, methods | Language idiom (`camelCase` / `snake_case` / `PascalCase`), starting with a verb | `requestRoomEntry`, `verify_room_key` |
| Booleans, predicates | `is`, `has`, `can`, `should` prefix | `isExpired`, `hasValidKey` |
| Private fields | `_camelCase` where the language has no private keyword or the project already uses it; otherwise the language idiom | `_permissionRepo` |
| Constants | `UPPER_SNAKE_CASE` for module and global constants | `DEFAULT_TOKEN_TTL_MS = 300_000` |
| Error codes | `UPPER_SNAKE_CASE` strings or enum members | `'ROOM_ACCESS_DENIED'` |

- No magic values (`glossary.md`). Name them as constants next to where they are used, or in the module's constants section.
- Names say what something *is*, not its type. Write `expiresAtMs`, not `numberValue`.
- Abbreviations only when universal (`id`, `url`, `http`, `ms`).

## file-order — File order

Top to bottom, in every class or module file:

1. Banner
2. Imports and dependencies
3. Constants, types and interfaces local to the file
4. Class definition and state
5. Constructor and initialization
6. Public functions, one region per capability
7. Protected and internal functions
8. Private helpers

A file that holds no class keeps the same order without items 4–5.

## i18n — User-facing text

- When the profile has `ui-strings: localized`, all user-facing text lives in the translation files the profile names, and code refers to it by key. Those files may be in any language.
- When the profile has `ui-strings: english`, user-facing text may be inline. It is still collected in one constants module per Room once there are more than a handful of strings.
- Log messages and error codes are never translated. They are for developers.
