# Optional Daisy Skin integration

The launcher retains discovery and instance-toggle support for locally supplied
`daisy-skin-0.1.0+<minecraft>.jar` files. This repository does not contain their buildable
source or reproducible outputs. No target is advertised as ready, and the old generated
manifest of unverified external JARs has been removed.

Official launcher packaging excludes the `bundled/skin` directory. A local developer
can keep independently reviewed files there for testing; their provenance, applicable
license and compatibility must be established before any future distribution. The main
Fabric client, local skin previews and core launcher do not require these files.
