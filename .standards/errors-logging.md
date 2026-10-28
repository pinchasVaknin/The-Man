# Error handling and logging

The system never fails silently and never leaks internals. The full `Result`, exception and
logger primitives are in build-protocol `golden/`. Per-language equivalents are in
`applicability.md`.

## result-vs-exception — Expected failures return, unexpected failures throw

| Kind (`glossary.md`) | Examples | Mechanism |
|---|---|---|
| **Expected** | Invalid input, not found, permission denied, conflict, rate-limited | **Return** `Result.fail(code)`, or the language's native equivalent. The caller must handle it, and the type system makes that visible. |
| **Unexpected** | Dependency down, corrupted state, missing injected dependency, broken invariant | **Throw** a typed exception derived from the project's base (`AppException`). It travels to the error boundary. |

Never:
- An empty `catch`, or a `catch` that logs and then pretends nothing happened (returns `null`, a default, or carries on).
- Throwing strings or bare `Error("…")` in production code. Throw a typed subclass with an error code.
- Exceptions for control flow. If the caller is expected to branch on it, it is a `Result`.

Allowed:
- Catching an exception **at an adapter** to turn a known infrastructure condition into a `Result`. For example, a unique-key violation becomes `Result.fail('ALREADY_EXISTS')`. Catch the specific type only.
- Catching to add context and rethrow (wrap with the cause attached).

## guard-clauses — Guard clauses

- Public functions validate their preconditions at the top and return or throw immediately. After the guards, the main path runs flat, without nesting.
- Validate data from outside the module once, at the boundary or entry point. Private helpers trust data their own module already validated, and do not repeat the checks.
- A violated guard on input from outside is an expected failure (`Result.fail`). A violated guard on a constructor argument or internal invariant is a programmer error (throw).

## error-boundary — One error boundary per entry point

Each entry point (HTTP middleware, socket handler, CLI `main`, game-loop top level, worker entry) has one top-level handler that:

1. Logs the full exception with `error` level, stack trace, correlation ID and safe context.
2. Returns or shows a safe, opaque error, for example `{ errorCode: 'INTERNAL_ERROR', correlationId }`, with no stack, no paths and no SQL (`security.md`, `error-leakage`).
3. Decides whether the process can continue. A corrupted state stops the process. A failed request does not.

## logging — Structured logging

- Log through the project's logger abstraction (`ILogger`, or the language equivalent from `applicability.md`). Production code never writes logs with raw `console.log`, `print`, `printf` or `System.out`. For CLIs, see `program-output`.
- Each entry is a **fixed message plus structured fields**:
  - Good: `logger.warn('Room entry blocked', { userId, roomId, correlationId })`
  - Bad: `logger.warn('User ' + userId + ' blocked from ' + roomId)` (cannot be searched or aggregated)
- Levels:

| Level | For |
|---|---|
| `debug` | Diagnostic detail for development. Off in production by default. |
| `info` | Significant business events: started, granted, completed. |
| `warn` | Expected but notable: blocked attempts, retries, limits reached, degraded mode. |
| `error` | Something failed and an operation did not complete. |

- **Per-frame and per-packet code does not log at `info` or above.** Aggregate the counts and log them periodically.
- Tests assert on important logs (security blocks, failures) through the injected logger double.

## redaction — Never logged

- Passwords and password hashes, API keys, tokens, session IDs, room keys, private keys.
- Full card numbers, CVV, government IDs.
- Raw request bodies and unvalidated payloads.
- Personal data beyond an opaque user ID, unless the profile names a reason.

When unsure, log the ID and not the value.

## program-output — Program output in CLIs and scripts

For `cli` and `scripts` (`applicability.md`):

- What the user asked the program to produce (results, tables, generated text) is **output**, not logging. Write it to stdout through one small output function or module, so it can be swapped and tested.
- Diagnostics, progress and errors go to stderr or to the logger.
- Exit codes are part of the contract. Document them in the CLI's help and in the README.
