# Branding compatibility audit

`scripts/audit-branding.py` scans working-tree text, paths and PNG text metadata for
legacy project names. It excludes dependency caches and generated outputs, and writes
an optional JSON report. Exact-line exceptions have occurrence limits and reasons;
legal/provenance and historical records use pinned SHA-256 snapshots.

Stable config keys, resource IDs, wire formats, old-JAR cleanup patterns and compatibility
IPC aliases remain where changing them would break existing installations. Service URLs
are retained dependencies, not proof that Daisy operates those services. Original source
authorship and third-party notices remain credited. Current project branding is Daisy.

Run `python scripts/audit-branding.py --show-allowed --report build/reports/branding.json`
for the actual inventory. The audit is not a license certification or an image-ownership
test; `assets/licenses.json` and `verify-licenses.py` cover recorded binary provenance.
