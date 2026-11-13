"""Version rules shared by release preparation, staging and verification."""
import re

VERSION = re.compile(r"\d+\.\d+\.\d+(?:\.\d+){0,2}(?:-(?:alpha|beta|rc)\.\d+)?")


def version_key(value):
    if not VERSION.fullmatch(value):
        raise ValueError(f"Invalid release version: {value!r}")
    core, _, prerelease = value.partition("-")
    parts = [int(part) for part in core.split(".")]
    channel, _, sequence = prerelease.partition(".")
    return (*parts, *([0] * (5 - len(parts))), {"alpha": 0, "beta": 1, "rc": 2, "": 3}[channel], int(sequence or 0))
