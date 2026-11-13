"""Package the standalone local-skin subset of an already compiled/remapped client.

No opaque binaries or second source tree: every class comes from the corresponding
Stonecutter build. Fail if that subset gains an unbundled Daisy dependency.
"""
import json
import re
import zipfile
from pathlib import Path

CLASSES = {
    "dev/daisy/clientcore/mixin/AvatarSkinMixin",
    *{"dev/daisy/clientcore/cosmetic/" + name for name in (
        "AppearanceAsset", "AppearanceAssetCache", "LocalAppearanceService",
        "PlayerAppearance", "SkinModel")},
}


def build_skin(client, target):
    with zipfile.ZipFile(client) as source:
        metadata = json.loads(source.read("fabric.mod.json"))
        names = {name for name in source.namelist() if name.endswith(".class")
                 and name.removesuffix(".class").split("$", 1)[0] in CLASSES}
        if not all(name + ".class" in names for name in CLASSES):
            raise ValueError("Client is missing the standalone skin classes")
        for name in names:
            data = source.read(name)
            for reference in re.findall(rb"dev/daisy/[A-Za-z0-9_$/]+", data):
                # Kotlin preserves this source typealias in metadata; bytecode uses
                # Minecraft's Identifier/ResourceLocation and has no McId class.
                if reference == b"dev/daisy/clientcore/compat/McId" and reference.decode() + ".class" not in source.namelist():
                    continue
                if reference.decode() + ".class" not in names:
                    raise ValueError(f"Skin subset has an external Daisy dependency: {reference!r}")
        metadata.update(id="daisy_skin", name="Daisy Local Skins",
                        description="Local-player skins for plain Fabric instances. Built from Daisy source.",
                        mixins=["daisy-skin.mixins.json"], breaks={"clientcore": "*"})
        metadata.pop("entrypoints", None)
        mixins = json.loads(source.read("clientcore.mixins.json"))
        mixins["client"] = ["AvatarSkinMixin"]
        mixins.pop("mixins", None)
        mixins.pop("server", None)
        contents = {name: source.read(name) for name in names}
        for name in source.namelist():
            if name.startswith("META-INF/licenses/") or name in {
                "META-INF/LICENSE", "META-INF/THIRD_PARTY_NOTICES.md", metadata.get("icon"), mixins.get("refmap")
            }:
                contents[name] = source.read(name)
        contents["fabric.mod.json"] = (json.dumps(metadata, indent=2) + "\n").encode()
        contents["daisy-skin.mixins.json"] = (json.dumps(mixins, indent=2) + "\n").encode()
        contents["META-INF/MANIFEST.MF"] = (
            "Manifest-Version: 1.0\nImplementation-Title: Daisy Local Skins\n"
            f"Implementation-Version: {metadata['version']}\n\n").encode()
    target = Path(target)
    target.parent.mkdir(parents=True, exist_ok=True)
    temporary = target.with_suffix(".jar.partial")
    try:
        with zipfile.ZipFile(temporary, "w", compression=zipfile.ZIP_DEFLATED) as output:
            for name, data in sorted(contents.items()):
                info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                info.external_attr = 0o100644 << 16
                output.writestr(info, data)
        temporary.replace(target)
    finally:
        temporary.unlink(missing_ok=True)
    return target
