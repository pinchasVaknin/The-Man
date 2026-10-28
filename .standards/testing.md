# Testing and TDD

Test code is production code. It follows `code-style.md` (banner, section headers, regions)
with the additions below. A complete test file in TypeScript and in Python is in
build-protocol `golden/`.

## tdd-cycle — Red, green, refactor

For new behaviour and for bug fixes:

1. **Red.** Write a test for the behaviour, or for the bug's reproduction. Run it. It must fail **for the expected reason**: an assertion, not a syntax error or broken setup. Show that failure (`workflow/verification.md`).
2. **Green.** Write the least production code that makes it pass. Nothing speculative.
3. **Refactor.** With all tests green, clean up the production and test code to the standards. Run the tests again.

A bug fix always starts with a test that reproduces the bug.

## tdd-exemptions — When test-first does not apply

| Change | Instead |
|---|---|
| Refactor with no behaviour change | The existing tests are the oracle. Run them before and after. If the code has no tests, add *characterization tests* that pin the current behaviour first, as their own part. |
| Visual and layout UI | Screenshot evidence. Logic under the UI still gets tests (`architecture.md`, `humble-ui`). |
| Spikes | No tests (`workflow/lifecycle.md`, *Spikes*). |
| Config, docs, copy text | Load or render check. |
| Generated code | Test the generator or its input, not the output. |
| Wiring in the composition root | Covered by one integration or startup test, not unit tests. |
| Performance tuning | A benchmark before and after (`workflow/verification.md`), and the existing tests still green. |

Write the exemption you used in the plan's "Verified by".

## aaa — Arrange, act, assert

Every test has three phases, each marked by a comment:

```ts
// Arrange
const sut = new VaultAccessService(createMockPermissionRepo(true), createMockLogger(), fixedClock);

// Act
const result = await sut.requestRoomEntry(validRequest);

// Assert
expect(result.isSuccess).toBe(true);
```

- **Act is exactly one statement.** It calls the unit under test.
- When the runner needs the call wrapped to assert a throw, write the phase as `// Act & Assert` with a single `expect(() => …).toThrow(…)` statement. This is the only time Act and Assert are combined.
- Arrange builds a fresh unit under test (`sut`) and its doubles. Use factory helpers for repeated setup.

## naming — Test names

`<unit>_When<Condition>_Should<Outcome>`

- `requestRoomEntry_WhenKeyIsValid_ShouldReturnScopedToken`
- `constructor_WhenRepositoryIsMissing_ShouldThrowInfrastructureCorrupted`
- In Python, prefix with `test_`: `test_install_WhenProjectIsEmpty_ShouldCreateProfile`.

The name alone tells a reader of a failure report what broke.

## file-layout — Test file layout

Section headers, in this order. Leave out a section that would be empty:

1. `IMPORTS & TEST DEPENDENCIES`
2. `TEST FIXTURES & FACTORIES`
3. `HAPPY PATH TESTS`
4. `GUARD CLAUSE & VALIDATION TESTS`
5. `SECURITY TESTS`, only where `security.md` applies to the unit
6. `EDGE CASES & INFRASTRUCTURE FAILURES`

Test files mirror the unit's path: `src/vault/VaultAccessService.ts` → `src/vault/VaultAccessService.spec.ts`, or the project's existing convention.

## isolation — Fast, isolated, repeatable

- **Fast:** a unit test takes milliseconds. Real databases, file systems, networks and `sleep` are not used in unit tests.
- **Isolated:** each test builds its own state. Tests do not depend on order and share no mutable globals.
- **Repeatable:** time, randomness and IDs come from injected sources (`architecture.md`, `dependency-injection`), so results are the same on any machine at any hour.
- **Linear:** no `if`, `switch`, `try/catch` or loops that decide *what* a test does or asserts. Use the runner's parametrization for multiple cases (`it.each`, `@pytest.mark.parametrize`, or a `for` loop whose only body is one `subTest` block in `unittest`). An expression that only gathers data for one assertion is fine, for example collecting the written file names into a set.

## anti-cheating — Rules that keep tests honest

- **Test through the public API.** Never call, reflect into or assert on private members. A private helper that needs its own tests is a separate unit: extract it.
- **Never weaken an existing test** to make code pass: no deleting, skipping, loosening assertions or raising timeouts. The only exception is when the requirement itself changed, and you say so (contract C5).
- **No tautologies:** no `expect(true).toBe(true)`, and no assertion that only checks a value is defined. Assert the actual value or error code.
- **Mock only boundaries:** ports and cross-Room interfaces. Never mock the unit under test, or value objects.
- Each test fails for exactly one reason. Several `expect`s are fine if they describe one outcome.

## integration — Integration tests

- Kept apart from unit tests (for example `tests/integration/`), and run by their own command.
- Test real adapters against real or containerized dependencies: queries, sockets, file formats.
- Each one cleans up after itself.
- One startup or wiring test per deployable proves the composition root assembles.
