# Security and configuration

Security is part of the design, never a later pass. Which sections apply depends on the project
type (`applicability.md`). Client-side code in particular follows notes 8 and 9 there.

## input-validation — Validate at the boundary

Treat everything from outside as hostile until it is validated: HTTP bodies, query strings, headers, socket messages, CLI arguments, files, environment, third-party responses, and, for a client, data from the server.

- **Validate against a schema at the boundary:** type, length, numeric range, enum membership, format.
- **Allowlist, never blocklist.** Map only the allowed fields into a typed DTO, and drop or reject everything else. That keeps an attacker from setting `isAdmin` or `balance`.
- **Encode output for where it goes:** HTML-escape text rendered in a page, and use the framework's safe binding (never `innerHTML` with user data).
- After the boundary, code works with the validated type, never the raw input.

## injection — Injection and path traversal

- **Queries:** parameterized queries or typed ORM parameters only. Never build SQL, NoSQL or GraphQL by concatenating or interpolating input.
- **Commands:** never pass user-controlled text to a shell (`exec`, `system`, `eval`, `shell=True`). Use the language API, or pass an argument array to a process API that does not invoke a shell.
- **Paths:** never join user input into a path directly. Resolve the canonical path and check that it is inside the allowed base directory.
- **Deserialization:** never deserialize untrusted data into executable or arbitrary types (`pickle`, `BinaryFormatter`, YAML full loaders).

## secrets-config — Secrets and configuration

- No secret in source, tests or tracked config: API keys, credentials, signing keys, private URLs.
- Secrets come from the environment or a secret manager.
- **One configuration module per deployable** reads and validates everything at startup, before ports open or the loop starts.
  - A missing, empty or malformed required value stops startup with a clear message.
  - An **optional override is validated too**. A non-numeric or out-of-range value stops startup. It never silently becomes `NaN` or falls back to the default.
  - Every limit has a hard upper bound that an override cannot exceed.
- `.env`, `.env.*` (except `.env.example`), `*.pem`, `*.key` and credential files are in `.gitignore`.
- Every new variable gets a line in `.env.example` with a placeholder and a comment.
- **Client-side code holds no secrets at all** (`applicability.md`, note 8).

## authz-rooms — Locked rooms (authorization)

Authentication at the front door says *who* the caller is. It never grants entry to the rooms inside.

- **Every Room checks permission itself,** before it acts: a room-scoped key, capability or role for this action.
- **No master keys.** No role, service account or module bypasses the room checks by default.
- **Least privilege by interface.** A consumer that only reads gets `IRoomStatusReader`, never `IRoomAdmin` (`architecture.md`, `solid` → ISP).
- **Ownership on every resource access (anti-IDOR).** Never load a client-supplied ID without checking that the caller owns it or holds a key for it:
  - Forbidden: `repository.getDocumentById(request.documentId)`
  - Required: `repository.getDocumentByIdAndOwner(request.documentId, caller.id)`
- Room tokens are short-lived and bound to both the user and the room.
- A denial is an expected failure (`Result.fail('ROOM_ACCESS_DENIED')`), logged at `warn` without the key.

## anti-dos — Application-level resource limits

The network edge (WAF, CDN) handles volumetric floods. The application itself must survive a few hostile requests. The defaults below apply unless the profile's "Overrides" changes them, with a reason, and always within a hard upper bound:

| Defence | Default | Notes |
|---|---|---|
| Payload size cap, enforced *before* parsing | 1 MB for JSON/REST. 64 KB per real-time packet | Reject with a size error, and never buffer the rest |
| Rate limiting per IP and per user | Strict tier 5–10/min for login, key checks, password reset and exports. Standard tier for the rest | Sliding window or token bucket |
| Page size and parse depth | `MAX_PAGE_SIZE = 100`, nesting depth 10 | Never allow `limit=999999` |
| Timeouts | 5,000 ms per request. Every outbound call has its own timeout, plus a circuit breaker for external APIs | Slow-client protection on sockets |

For `game`, only the networking rows apply: packet caps, per-connection rate limits and timeouts (`applicability.md`, note 10).

## crypto — Cryptography

- Never write your own cryptography. Use the platform's vetted libraries.
- Passwords and long-lived secrets are hashed with Argon2id (preferred) or bcrypt, with a unique salt. Never MD5, SHA-1 or plain SHA-256 for passwords.
- Compare secrets, tokens and signatures in constant time (`timingSafeEqual`, `hmac.compare_digest`).
- Randomness for security uses a CSPRNG (`crypto.randomUUID`, `secrets`), never `Math.random`.

## error-leakage — Opaque external errors

- What a caller sees: a stable error code, a correlation ID, and a human message that reveals nothing internal.
- What a caller never sees: stack traces, SQL, table or column names, file paths, library versions, config values.
- The details go to the internal log (`errors-logging.md`, `error-boundary`).
