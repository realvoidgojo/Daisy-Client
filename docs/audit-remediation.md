# Audit remediation — 14 November 2026

Baseline: `c9a468d` / v1.0.2. The supplied audit is a set of findings to verify,
not evidence that every reported failure remains reproducible.

## Stage 1: security boundaries

| Finding | Result | Implementation and verification |
| --- | --- | --- |
| 1. RVR traversal | Fixed | Reproduced an outside-file overwrite in an isolated fixture before remediation. Archive paths now reject traversal, absolute/drive/UNC paths, device names, alternate streams, links and aliases. ZIP metadata is validated before extraction; declared expansion, actual bytes and CRC are checked. Snapshot settings have an explicit allowlist and are validated before creating an instance. Tests preserve an outside canary. |
| 2. Log deletion/export | Fixed | Both operations require a regular, unlinked log file under approved log directories. Tests exercise the actual deletion handler with an outside canary. |
| 3. Arbitrary OS path opening | Fixed | File opening requires approved application/instance roots and permits directories or `.log`/`.txt` files. Folder creation checks its existing ancestor and its resulting destination. Content mutations also reject path-shaped filenames; explicit instance paths must identify registered instances. |
| 4. Arbitrary external protocols | Fixed | OS links require HTTPS, an exact approved product/service hostname, no credentials and the standard HTTPS port. Protocol, hostname suffix, credential and localhost tricks are rejected. New partner domains require a deliberate policy change. |
| 5. Renderer sandbox | Enabled | All three windows use `sandbox: true`; preloads require only Electron's supported bridge APIs. Every IPC handler checks the known window, main frame, exact local page and page capability. New windows, webviews, remote navigation and permission requests are denied. Existing copy buttons use a bounded write-only clipboard IPC capability; clipboard read remains denied. The isolated Windows startup smoke passed. Production Linux startup no longer disables Chromium's sandbox. Ubuntu CI smoke passed; distribution-specific sandbox policy still needs native testing. |
| 6. Unbounded NBT | Fixed | Input 8 MiB, expanded data 32 MiB, depth 64, 100,000 nodes/elements and 65,535-byte strings; reads and offsets are bounded. Negative/truncated arrays, invalid tags, compression bombs and prototype-looking keys have tests. File reads and decompression in world/server loading are asynchronous; unchanged metadata has a bounded cache. |

Archive compatibility is intentionally limited to single-disk, non-ZIP64 stored or
deflated ZIPs with ASCII/UTF-8 names. Unsupported archives fail explicitly. Native
JARs, RVR imports and modpack overrides use the same extractor. The link checks
protect archive/renderer-controlled paths; they do not claim to isolate Daisy from
another malicious process running as the same operating-system user.

## Stage 2: memory and responsiveness

| Finding | Result | Implementation and remaining work |
| --- | --- | --- |
| 7. Main-process monolith | Initial service extraction complete | Archive safety, IPC policy, NBT, downloads/hashing and storage traversal are independent modules. Launch, legacy updates, accounts and instance orchestration remain in `main.js`; extract those workflows in subsequent focused changes rather than changing all lifecycle contracts together. |
| 8. Blocking filesystem work | Hot paths improved; further work remains | Downloads, SHA verification, native extraction, world sizes, storage scans, world metadata reads and NBT decompression are asynchronous. Storage scans share in-flight work, cache briefly and invalidate after deletion. Small settings operations and legacy JAR metadata/setup still use synchronous APIs; profile and migrate them by workflow. |
| 9. Whole-response downloads | Fixed | Downloads stream through a bounded pipeline into unique temporary files, enforce expected/maximum sizes (1 GiB default), cancel stalled transfers and clean up failures. Progress is emitted during transfer and at completion. Tests cover missing length, truncated/oversized bodies, bad checksums, HTTP errors, disk errors and stalls. |
| 10. Whole-file SHA verification | Fixed for update/library verification | SHA-256/SHA-1 verification streams from disk. The synchronous instance-install API retains its contract but hashes with a fixed 64 KiB buffer; making the whole setup API asynchronous is follow-up work under finding 8. |
| 11. Native JAR expansion | Fixed | Metadata and entries stream from a held file descriptor, with entry/total expansion limits, CRC verification and safe atomic replacement. Existing native files are reused only after size/CRC validation; corrupted files are repaired. All native extraction entry points use this path. |
| 12. Large Kotlin screens | Initial component extraction complete | Module cards, friend text fields and the roster projection now have separate components/models. Screens keep navigation, focus, selection and lifecycle state. Remaining settings/chat panels should be extracted as independent features, with native interaction checks. |
| 13. Large React views | Initial component extraction complete | Settings sections, storage UI, local accounts, instance version selection and repair results are separate feature components. Remaining view orchestration can be reduced incrementally. Bundle and native startup checks pass. |
| 14. Per-frame costs | Instrumentation added; gameplay baseline pending | Opt-in JFR spans cover HUD, social tick, cape lookup/application, waypoint geometry/labels and media tick. A synthetic recording verified named events, and disabled profiling produced no sample. No gameplay speedup or hardware benchmark is claimed. |

## Stage 3: builds, dependencies and CI

| Finding | Result | Evidence and limits |
| --- | --- | --- |
| 15. Deprecated transitive dependencies | Traced; upstream work remains | npm reports **zero known vulnerabilities**, including development dependencies. `rimraf`/`glob`/`inflight` come through packaging tools; `boolean` is also transitive tooling. No incompatible major-version overrides were added merely to hide warnings. Dependabot now checks npm, Gradle and Actions weekly. |
| 16. Stonecutter resolution | Reported blocker not reproduced | Official 0.9.7 marker and implementation POMs are reachable; implementation JAR returned HTTP 200. Both the default target and all 13 configured targets built successfully locally. These builds used existing caches and do not prove a fresh machine can resolve every dependency. CI now checks the configured official metadata before Gradle and reports repository/network diagnostics. |
| 17. Headless Linux smoke | Tooling/docs updated | Smoke tooling fails immediately with an `xvfb-run` command when no display exists. Only CI smoke processes may use `--no-sandbox`; shipped Linux startup keeps sandboxing enabled. CI now runs both Windows startup and Ubuntu startup under Xvfb. The shipped sandbox still requires a compatible native host namespace/helper policy. |
| 18. Scanning visibility | Hosted scanners running | GitHub reported CodeQL default setup `not-configured`; secret-scanning access remained unavailable (404), so its service state is unknown. Added pinned CodeQL advanced analysis for Java/Kotlin and JS/TS, plus pinned Gitleaks with redaction, comments/artifacts disabled. Workflow lint passed. Local Gitleaks scanned 48 commits with no leaks. The first hosted CodeQL analysis passed for both languages; reviewed JavaScript findings are documented below. |

## Validation recorded locally

- License verification: 605 packages, 138 assets, zero errors.
- Project verification: 211 source files, zero errors.
- Branding audit: zero unexpected references. Only existing compatibility-handler
  justifications changed to match the secured IPC registrar.
- Python regression suite: 20 passed.
- Launcher regression suite: 84 passed.
- Launcher bundle and isolated sandboxed Windows startup: passed.
- Gradle default client/bootstrap checks: passed.
- Gradle `build check` across all 13 configured Minecraft targets: passed,
  180 tasks, 4m 29s. Existing deprecation/mixin warnings remain.
- npm audit: zero known vulnerabilities.
- Official-checksum-verified Actionlint 1.7.12: updated workflows passed.
- Official-checksum-verified Gitleaks 8.30.1: no leaks found in repository history.
- JFR instrumentation: disabled path and five named synthetic events verified.

Reports and generated binaries live under ignored `build/reports` and `build/`.
No release version is changed by this remediation. Existing published assets are
not evidence that these source changes are installed.

## Hosted scanner review

The first hosted JavaScript scan completed and flagged two patterns. The offline
UUID uses MD5 for Java-compatible UUIDv3 identity, not authentication or integrity;
JDK 21 independently produced the same UUIDs for `LocalPlayer` and `Notch`.
Changing this algorithm would change existing local identities. See
[Java UUID.nameUUIDFromBytes](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/UUID.html#nameUUIDFromBytes(byte%5B%5D)).

The installer handoff only receives the fixed-name asset returned by the
repository/size/SHA-256-validated downloader. It passes an argument vector directly
to Node spawn; shell interpretation is explicitly disabled. Control characters
and quotes are rejected, and regression checks preserve spaces/metacharacters as
literal arguments. Scanner classifications must retain this context rather than
silencing a rule across the repository.

A final replacement review removed delete-before-rename and in-place-copy
fallbacks: a failed Windows replacement now preserves the working destination.
The regression test exercises the actual launcher finalization handler.

## Next staged work and acceptance criteria

1. Run the new hosted scanners and native Linux smoke; resolve actual findings or
   host-policy failures before describing those checks as passing.
2. Extract accounts/instances/legacy updates one workflow at a time, preserving
   offline accounts, stored profiles, disabled mods, existing worlds and updater
   handoff behavior. Keep the existing regression and packaged startup gates.
3. Split the remaining Kotlin settings/chat panels and React view orchestration;
   verify keyboard, mouse, focus, scrolling and modal behavior in the native apps.
4. Record representative gameplay with the profiling procedure below. Compare
   the same world, settings, hardware and warm-up, then optimize measured costs.

## Runtime profiling procedure

Add these JVM arguments to an isolated development instance using a locally built
client JAR (the release JAR does not contain unreleased source changes):

```text
-Ddaisy.profile=true
-XX:StartFlightRecording=filename=daisy-profile.jfr,settings=profile,dumponexit=true,maxsize=128m,maxage=5m
```

Use a disposable world. After a warm-up, capture at least 60 seconds each with the
normal HUD, social roster/chat activity, cosmetics, visible waypoints and active
media. Open the recording in JDK Mission Control, filter events by
`dev.daisy.Section`, and compare duration distributions by `section` alongside
allocation, GC and execution samples. Waypoint geometry and labels are separate
because newer Minecraft versions may submit geometry for execution later.
Social/media spans measure client-thread scheduling work; network/background
workers need ordinary JFR execution samples as well. Remove the arguments after
the investigation. Record hardware/settings and p50/p95/p99 observations before
making performance claims.
