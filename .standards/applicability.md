# Applicability: which standards apply where

Read this once per task. It turns the profile's `type` and `languages` into the list of
standard sections that apply. A profile line other than `auto` under "Applicable standards"
overrides this matrix for that standard.

For `type: mixed`, each changed file takes the type of the longest matching path under
`components`. A file that matches no component uses the strictest type among the components.

## Section IDs

Every standards file is split into sections with these IDs. The profile and the overrides
refer to them as `<standard>/<section>`, for example `security/anti-dos`.

| Standard | Section IDs |
|---|---|
| code-style | `language`, `file-banner`, `section-headers`, `regions`, `doc-blocks`, `naming`, `file-order`, `i18n` |
| architecture | `solid`, `strategy-dispatch`, `dependency-injection`, `layers`, `humble-ui`, `immutability`, `non-blocking`, `concurrency`, `efficiency`, `hot-path` |
| testing | `tdd-cycle`, `tdd-exemptions`, `aaa`, `naming`, `file-layout`, `isolation`, `anti-cheating`, `integration` |
| errors-logging | `result-vs-exception`, `guard-clauses`, `error-boundary`, `logging`, `redaction`, `program-output` |
| security | `input-validation`, `injection`, `secrets-config`, `authz-rooms`, `anti-dos`, `crypto`, `error-leakage` |
| git | `branches`, `commit-format`, `atomic-commits`, `hygiene` |

## Matrix by project type

✔ applies · ✗ does not apply · ◐ applies in part (see the note)

| Section | web-server | web-client | game | cli | library | desktop / mobile | scripts |
|---|---|---|---|---|---|---|---|
| code-style (all) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ ¹ |
| architecture/solid, immutability, efficiency | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✗ |
| architecture/strategy-dispatch | ✔ | ✔ | ✔ ² | ✔ | ✔ | ✔ | ✗ |
| architecture/dependency-injection | ✔ | ◐ ³ | ✔ | ◐ ³ | ✔ | ✔ | ✗ |
| architecture/layers | ✔ | ✔ | ✔ | ◐ ⁴ | ◐ ⁴ | ✔ | ✗ |
| architecture/humble-ui | — | ✔ | ✔ | — | — | ✔ | — |
| architecture/non-blocking, concurrency | ✔ | ✔ | ✔ | ◐ ⁵ | ✔ | ✔ | ✗ |
| architecture/hot-path | ◐ | ◐ | ✔ | ◐ | ◐ | ◐ | ✗ |
| testing (all but integration) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ ⁶ |
| testing/integration | ✔ | ◐ | ◐ | ◐ | ✗ | ◐ | ✗ |
| errors-logging (all but program-output) | ✔ | ✔ | ✔ | ✔ | ✔ ⁷ | ✔ | ◐ ¹ |
| errors-logging/program-output | ✗ | ✗ | ✗ | ✔ | ✗ | ✗ | ✔ |
| security/input-validation, injection | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| security/secrets-config | ✔ | ✔ ⁸ | ✔ ⁸ | ✔ | ✔ | ✔ ⁸ | ✔ |
| security/authz-rooms | ✔ | ◐ ⁹ | ◐ ⁹ | ✗ | ✗ | ◐ ⁹ | ✗ |
| security/anti-dos | ✔ | ✗ | ◐ ¹⁰ | ✗ | ✗ | ✗ | ✗ |
| security/crypto, error-leakage | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ◐ |
| git (all) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |

Notes:

1. **scripts**: The file banner and naming apply. Section headers, regions and doc blocks apply only to files over the size threshold in `glossary.md`. Errors: fail loudly with a clear message; the `Result` type is not required.
2. **game**: Strategy dispatch is the rule. `hot-path` is the documented way out for per-frame code.
3. **web-client / cli**: In functional code (React components, hooks, small CLIs), inject collaborators as parameters, props or context instead of constructor injection. The rule against creating infrastructure inside business logic still holds.
4. **cli / library**: There is no presentation layer. The domain/application split still applies when the code has both business rules and I/O.
5. **cli**: Blocking I/O is allowed in a CLI whose whole job is sequential I/O. It is not allowed inside a long-running interactive loop.
6. **scripts**: Tests are required when the script mutates data or is run by other people. A one-off local script needs evidence by running it (`workflow/verification.md`).
7. **library**: Never log by default. Accept an optional logger from the caller, and return errors rather than logging them.
8. **client-side code** (web-client, game client, desktop, mobile) cannot hold secrets: anything shipped to a user is public. The rule becomes: no secrets in the client at all, and config is validated at startup.
9. **clients**: The server is the authority. The client still never trusts its own state for permission decisions it sends to the server, and it validates data received from the server.
10. **game**: Applies to the game's server or networking layer (packet size caps, per-connection rate limits, timeouts). Pagination does not apply.

## Language adaptations

The standards describe the shape. Each language keeps its own idiom for it.

| Concern | TypeScript / JavaScript | Python | C# | Java | C / C++ | Go | Rust |
|---|---|---|---|---|---|---|---|
| Region markers (`regions: auto`) | `// #region` | `# region` | `#region` | `// region` (IntelliJ) | `// #region` ¹¹ | ✗ none | ✗ none |
| Section header close | `\\` | `#` | `\\` | `\\` | **`//`** ¹² | `//` | `//` |
| Interface prefix `I` | ✔ | ✗ (use `Protocol`, no prefix) | ✔ | ✗ | ✗ | ✗ | ✗ (traits) |
| Expected failures | `Result<T, E>` (golden) | `Result` dataclass (golden) or a typed exception per `errors-logging/result-vs-exception` | `Result<T, E>` | `Result<T, E>` or sealed types | `std::expected` (C++23) or status + out-param | `(value, error)` returns | native `Result<T, E>` |
| Logger abstraction | injected `ILogger` | `logging.Logger` passed in or per-module `getLogger(__name__)` | `ILogger<T>` | SLF4J `Logger` | project logger interface | `*slog.Logger` | `tracing` / `log` |
| Doc block | `/** Summary … */` | `"""Summary …"""` | `/// <summary>` | `/** … */` | `/** … */` or `///` | `// Name …` (godoc) | `///` (rustdoc) |
| Immutability | `readonly`, `Readonly<>`, `as const` | `@dataclass(frozen=True)`, tuples | `readonly`, `record` | `final`, records | `const` | unexported fields + constructors | default |

11. Supported by VS Code. Visual Studio uses `#pragma region` and `#pragma endregion`. Use whichever the project's editor setup already uses.
12. **Never end a `//` line with a backslash in C or C++.** The preprocessor joins the next line into the comment, and that line silently disappears. `scripts/check_standards.py` rejects it.

For a language not listed, take the language's documented community conventions (formatter, linter, doc tool) as the baseline. Then apply the standards' shape on top, wherever it does not fight that baseline. Say in the plan which conventions you used.
