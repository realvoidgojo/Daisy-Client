import os
import shutil
import glob
import json

VERSIONS = [
    "1.21", "1.21.1", "1.21.2", "1.21.3", "1.21.4", "1.21.5",
    "1.21.6", "1.21.7", "1.21.8", "1.21.10", "1.21.11", "26.1.2", "26.2"
]

print("Starting artifact sync across all versions...")

# 1. Copy newly built clientcore jars from versions/<v>/build/libs/ to:
# - local-artifacts/<v>/
# - launcher/app/bundled/<v>/
# - launcher/src/bundled/<v>/
# - launcher/dist/win-unpacked/resources/bundled/<v>/ (if exists)

for v in VERSIONS:
    libs_dir = os.path.join("versions", v, "build", "libs")
    if not os.path.exists(libs_dir):
        print(f"Warning: {libs_dir} does not exist!")
        continue
    
    # Find matching daisy-client or clientcore jar (exclude -sources, -dev if any)
    jars = [j for j in os.listdir(libs_dir) if j.endswith(".jar") and not j.endswith("-sources.jar") and not j.endswith("-dev.jar") and (j.startswith("daisy-client-") or j.startswith("clientcore-"))]
    if not jars:
        print(f"No jar found for {v} in {libs_dir}")
        continue
    
    # Prefer daisy-client-
    jars.sort(key=lambda x: (not x.startswith("daisy-client-"), x))
    jar_name = jars[0]
    src_jar = os.path.join(libs_dir, jar_name)
    
    dest_dirs = [
        os.path.join("local-artifacts", v),
        os.path.join("launcher", "app", "bundled", v),
        os.path.join("launcher", "src", "bundled", v),
        os.path.join("launcher", "dist", "win-unpacked", "resources", "bundled", v)
    ]
    
    for d in dest_dirs:
        os.makedirs(d, exist_ok=True)
        dest_jar = os.path.join(d, jar_name)
        shutil.copy2(src_jar, dest_jar)
        print(f"Copied {jar_name} -> {d}")
        
    # Also if v == "1.21.11", copy to root bundled
    if v == "1.21.11":
        for root_bundled in [
            os.path.join("launcher", "app", "bundled"),
            os.path.join("launcher", "src", "bundled"),
            os.path.join("launcher", "dist", "win-unpacked", "resources", "bundled")
        ]:
            if os.path.exists(root_bundled):
                dest_jar = os.path.join(root_bundled, jar_name)
                shutil.copy2(src_jar, dest_jar)
                print(f"Copied root bundled {jar_name} -> {root_bundled}")

print("Syncing daisy-skin jars...")
for v in VERSIONS:
    skin_src = os.path.join("local-artifacts", "skin", v)
    if os.path.exists(skin_src):
        for sj in os.listdir(skin_src):
            if sj.endswith(".jar"):
                src_sj = os.path.join(skin_src, sj)
                for d in [
                    os.path.join("launcher", "app", "bundled", "skin", v),
                    os.path.join("launcher", "src", "bundled", "skin", v),
                    os.path.join("launcher", "dist", "win-unpacked", "resources", "bundled", "skin", v)
                ]:
                    os.makedirs(d, exist_ok=True)
                    shutil.copy2(src_sj, os.path.join(d, sj))
                    print(f"Copied skin jar {sj} -> {d}")

# Clean client caches in AppData if present
appdata = os.environ.get("APPDATA", "")
if appdata:
    for cache_dir in [
        os.path.join(appdata, "daisy-launcher", "river-mod-cache"),
        os.path.join(appdata, "Daisy", "river-mod-cache"),
    ]:
        if os.path.exists(cache_dir):
            try:
                shutil.rmtree(cache_dir)
                print("Cleaned cache directory:", cache_dir)
            except Exception as e:
                print("Could not clean cache dir:", cache_dir, e)

print("Artifact sync finished successfully!")

