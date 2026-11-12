# Daisy Client: Legacy Fabric component

This is an independent Minecraft 1.8.9 Legacy Fabric build. It is not included by the
root Stonecutter build and is not a main-release artifact. No references establish that
it is obsolete, so it is retained. The initializer currently logs successful loading;
it is not the full modern client feature set.

With JDK 21 available for Gradle and Java 8 for a development game runtime:

```sh
# From the repository root
./gradlew -p legacy build
```

Its separate dependency/plugin resolution is required; successful modern-client builds
do not verify this build. Packages and the artifact basename use Daisy names. The
original Fabric mod ID, resource namespace and mixin config filename remain unchanged
for compatibility. Original author attribution remains in its Fabric metadata.
The root LICENSE applies; distribution authorization is unresolved.
