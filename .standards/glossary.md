# Glossary

Terms the standards use, with the thresholds that make them checkable. A number here is a
default. The profile's "Overrides" section can change it, and must give the reason.

| Term | Meaning | Threshold / test |
|---|---|---|
| **Room** | A feature module with one public entry point (an `index`, facade or exported interface). Other modules use only that entry point. | A folder whose files are imported from outside only through one entry file. A project under ~2,000 lines may be a single Room. |
| **Public API** | What a module exports for other modules to use. | Exported from the module's entry point, or marked public in a language without modules. |
| **Boundary** | The place where data enters from outside the process or trust zone: HTTP, sockets, files, CLI arguments, environment, IPC, third-party responses, the server for a client. | Validation happens here, once. |
| **Expected failure** | An outcome the caller should handle as part of normal operation: invalid input, not found, permission denied, insufficient funds. | If a correct program can hit it with valid code paths, it is expected. Returned, not thrown. |
| **Unexpected failure** | The system is broken: dependency down, corrupted state, programmer error, out of memory. | If hitting it means something is wrong with the system rather than the request, it is unexpected. Thrown. |
| **Open set** | A set of variants expected to grow: payment methods, weapon types, message kinds. | New members were added in the past, or are planned. |
| **Closed set** | A set of variants that is fixed by nature: `true/false`, `ok/error`, the four compass directions. | Adding a member would be a design change, not a feature. |
| **Hot Path** | Code whose speed measurably affects frame time, request latency or throughput. | **Measured**: a profile shows ≥ 5% of frame or request time, **or** it runs ≥ 1,000 times per second, **or** it runs per frame or per packet in a real-time loop. The measurement is cited in the `Design` doc. |
| **Heavy CPU work** | Work long enough to hurt responsiveness if it runs on the main thread or event loop. | > 4 ms per call on a UI or game main thread. > 50 ms on a server event loop. |
| **Small file** | A file too short to need structure markers. | Under 150 lines **and** fewer than 3 logical groups. Section headers and regions are optional. |
| **Logical group** | Code that belongs together and is read together: imports, state, construction, one public capability with its helpers, private helpers. | If you would collapse it as a unit in an editor, it is a group. |
| **Long function** | A function that should probably be split. | > 60 lines, or nesting deeper than 3 levels. A warning, not an error. Say in the report why if you keep it. |
| **Long file** | A file that should probably be split. | > 500 lines. A warning. |
| **Magic value** | A literal whose meaning is not obvious at the use site. | Any number other than `-1`, `0`, `1`, `2` in arithmetic, and any string used as a key, code or identifier. Name it as a constant. |
| **Doc density** | How much documentation each declaration gets. The profile's `doc-density` picks one. | See `code-style.md`, section `doc-blocks`. |
