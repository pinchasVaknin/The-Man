# Architecture, design principles and performance

How code is divided and how the parts depend on each other. Which sections apply to which
project type is in `applicability.md`. Thresholds are in `glossary.md`.

## solid — SOLID and the core principles

**Single responsibility.** A unit has one reason to change: one actor or concern that would ask for a change.
- **The "AND" test.** If describing the unit needs "and" between two *responsibilities*, split it. "Calculates order totals **and** sends confirmation emails" fails: pricing and messaging change for different reasons.
- Steps of one operation do not fail it. "Validates the request and issues a token" is one use case, entry, described in its steps.
- Ask: would two different people, or two different requirements, ask to change these two parts?

**Open/closed.** Adding a variant to an open set (`glossary.md`) must not require editing existing branches. See `strategy-dispatch`.

**Liskov substitution.** Every implementation honours the full contract of its interface.
- Never throw "not implemented" and never leave a no-op method. That means the interface is too wide (ISP).
- Never accept less input than the contract promises, and never return less than it promises (an unexpected `null`, for example).

**Interface segregation.** Narrow, role-specific interfaces: `IRoomReader`, `IRoomKeyValidator`, `IRoomStateMutator`, instead of one `IRoomManager` with fifteen methods. Each consumer gets only what it may call, which is also the security model (`security.md`, `authz-rooms`).

**Dependency inversion.** Business code depends on abstractions it owns. Infrastructure implements them. See `dependency-injection`.

**Also:**

| Principle | Rule |
|---|---|
| KISS | The simplest design that solves the actual problem. No clever one-liners, nested ternaries or meta-programming without a stated need. |
| DRY | Each piece of *domain knowledge* has one home. Two lines that merely look alike are not duplication. Do not couple unrelated modules to share them. |
| YAGNI | Build what the current task needs. No speculative flags, unused interface methods or "future-proof" layers. |
| Composition over inheritance | Share behaviour by composing collaborators. Business-logic inheritance is at most one level deep. Extending a framework's base class (`React.Component`, `THREE.Object3D`, `MonoBehaviour`) is not counted. |

## strategy-dispatch — Variant dispatch

- **Open sets** (`glossary.md`): no `switch (type)` and no `if (type === …)` chains for type-specific business logic. Instead:
  1. An interface for the variant behaviour (`IPaymentHandler`).
  2. One implementation per variant.
  3. An immutable key → implementation map, injected, and resolved in O(1).
  4. An unknown key returns an expected failure, never an exception.

```ts
public async processPayment(type: PaymentType, payload: PaymentPayload): Promise<Result<Receipt>> {
    const handler: IPaymentHandler | undefined = this._handlersByType.get(type);
    if (!handler) {
        return Result.fail<Receipt>('UNSUPPORTED_PAYMENT_TYPE');
    }
    return handler.execute(payload);
}
```

- **Closed sets**: a `switch` is fine *if the compiler checks it is exhaustive*. Examples: TypeScript `never` in `default`, Rust `match`, C# switch expressions with no discard, Java sealed types.
- **Hot paths**: see `hot-path`.

## dependency-injection — Dependency injection

- Business and application code never creates its collaborators: no `new PostgresRepository()`, `new HttpClient()` or `new Logger()` inside them.
- **Class-based code**: inject collaborators through the constructor, typed as interfaces, and keep them `readonly`. A missing dependency at construction is a programmer error, so throw.
- **Functional code** (React, hooks, small CLIs, Python modules): pass collaborators as parameters, props or context, or through a factory that receives them. The rule is "nothing reaches for infrastructure on its own". Constructors are just one way to follow it.
- Non-determinism is a dependency too: inject a clock (`IClock`) and an ID or random source whenever the result depends on them. That keeps tests repeatable (`testing.md`, `isolation`).
- Wire concrete implementations in one place: the composition root (`main`, the app bootstrap, the server entry).

## layers — Layers and Rooms

**Rooms (vertical slices).** Organize by feature (`billing/`, `combat/`, `inventory/`), not by technical kind. Other Rooms reach a Room only through its public entry point (`glossary.md`).

**Dependencies point inward:**

1. **Domain**: entities, value objects, rules, `Result` types, and port interfaces. It imports nothing from databases, HTTP, UI, engines or the file system.
2. **Application**: use cases. It orchestrates domain objects, checks permissions, logs, and returns `Result`. It depends on the domain and on injected ports.
3. **Infrastructure / adapters**: implement the ports (repositories, HTTP controllers, sockets, SDK wrappers).
4. **Presentation**: see `humble-ui`.

In a small project the layers may be files inside one Room instead of folders. The direction of the imports is what matters.

## humble-ui — Humble UI

- Views render the state they are given and forward user events. That is all.
- Calculations, validation rules and permission decisions live in the application layer, or in a presenter, store or hook that has no rendering in it.
- What tests prove: the logic under the UI is unit-tested. The view itself is checked by a screenshot (`workflow/verification.md`).
- **"Logic" means any rule.** A calculation, a condition, a validation or a state transition that decides something counts as logic. Setting state to a value with no decision in it does not count (`items = []`). Neither does wiring an event to a handler.
- **In `mode: existing`, when a view already owns its state**, a new rule still goes into a function outside the view, which the view calls. A plain reset may stay in the view, but the plan names the existing state-in-view as debt under "Not doing". Do not move the existing state as a side effect (contract C3).

## immutability — Immutability

- Fields, DTOs, parameters and returned data are immutable by default (`readonly`, `final`, frozen dataclasses, `as const`).
- Never mutate an argument. Return a new value.
- Mutation is allowed inside a function's own local variables, inside a documented hot path, and inside a state container whose job is mutation (a store, an ECS buffer). Document it in the container's Design.

## non-blocking — Never block the main loop

- I/O on a main thread, UI thread, game loop or server event loop is asynchronous.
- Forbidden there:
  - Synchronous file reads (`readFileSync`).
  - Blocking sockets.
  - `sleep` / `Thread.Sleep`.
  - Busy-wait loops.
- Startup code, before the loop starts, may block. CLIs follow `applicability.md` note 5.

## concurrency — Concurrency

- Offload heavy CPU work (`glossary.md`) to a worker, thread pool or job queue. Do not spawn threads for light work.
- Workers receive immutable snapshots or messages and return results. They never mutate shared domain, UI or game state.
- When shared memory is unavoidable (an engine component, for example):
  - Wrap it in a single thread-safe type.
  - Document the locking order in that type's Design.

## efficiency — Data access and algorithmic efficiency

- Repeated lookups go through a keyed `Map`, `Set` or dictionary, not a scan with `find` or `filter` inside a loop. A single scan of a short list is fine.
- **No N+1:** no query, file read or network call inside a loop. Batch-fetch before the loop.
- Every network and database call has an explicit timeout and supports cancellation.
- Every collection query has a limit. Never load an unbounded table into memory.

## hot-path — The hot-path exception

On a verified hot path (`glossary.md`: measured, and the measurement cited), these rules may be relaxed:

- `strategy-dispatch`: a direct `switch` over an enum or integer, static dispatch, or data-oriented arrays.
- `immutability`: pre-allocated buffers, object pools, in-place mutation.

The function's Design doc must say:
1. `[HOT-PATH EXCEPTION]`
2. Which rule it relaxes.
3. The measurement that justified it.
4. The budget it must stay within.

```ts
/**
 * Summary: Integrates positions and resolves collisions for all active entities this tick.
 * Design: [HOT-PATH EXCEPTION] Enum switch instead of IEntityBehaviour dispatch, and in-place
 *         buffer mutation instead of new snapshots. Profile 2026-10-12: 18% of frame time at
 *         400 entities via dispatch + allocation; now 3%. Budget: < 1 ms at 400 entities.
 */
```

Without a measurement it is not a hot path. Write it the normal way first and measure.
