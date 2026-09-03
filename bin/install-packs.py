#!/usr/bin/env python3
"""Install add-ons into the BDS data volume and activate them on the world.

Runs ON THE SERVER, called by bin/deploy.sh. Standard library only.

    install-packs.py ADDONS_DIR DATA_DIR STATE_DIR LEVEL_NAME

ADDONS_DIR is whatever `mc dev` rsynced up from the dev machine's MC_ADDON_DIR.
Anything an add-on project might emit is accepted, in any mix:

    <name>/manifest.json        an assembled pack directory
    <dir>/<name>/manifest.json  ...nested however deep (e.g. behavior_packs/x/)
    <name>.mcpack               a zipped single pack
    <name>.mcaddon              a zip of several packs, as dirs or nested .mcpack

Each pack is classified by its manifest's module types (resources -> resource
pack, everything else -> behavior pack), copied into DATA/behavior_packs or
DATA/resource_packs, and listed in the world's world_*_packs.json.

Only packs this script installed are ever removed. BDS unpacks ~140 stock
packs (vanilla, chemistry, editor) into the same directories and those must be
left alone -- and never listed on the world, or vanilla content loads twice.
The managed set is remembered in STATE/installed-packs.json.
"""

import json
import os
import re
import shutil
import sys
import tempfile
import zipfile

RESOURCE_MODULE_TYPES = {"resources", "client_data"}
SKIP_MODULE_TYPES = {"world_template", "skin_pack", "persona_piece"}
ARCHIVE_SUFFIXES = (".mcpack", ".mcaddon", ".zip")


def die(msg):
    print(f"  !! {msg} -- deploy stopped", file=sys.stderr)
    sys.exit(1)


def load_manifest(path):
    """Mojang's own manifests use // comments (JSONC); tolerate them."""
    with open(path, encoding="utf-8-sig") as f:
        text = re.sub(r"(?m)^\s*//.*$", "", f.read())
    return json.loads(text)


def safe_extract(archive, dest):
    """Extract a zip, refusing members that would escape dest (zip slip)."""
    with zipfile.ZipFile(archive) as zf:
        for member in zf.infolist():
            target = os.path.realpath(os.path.join(dest, member.filename))
            if not target.startswith(os.path.realpath(dest) + os.sep):
                die(f"{os.path.basename(archive)} contains an unsafe path {member.filename!r}")
        zf.extractall(dest)


def find_packs(root, label, tmp):
    """Yield (display_name, pack_dir) for every pack under root.

    A directory holding manifest.json is a pack; we don't descend into it.
    Archives are extracted into tmp and searched the same way, so a .mcaddon
    holding .mcpack files nests fine.
    """
    found = []
    for dirpath, dirnames, filenames in os.walk(root):
        if "manifest.json" in filenames:
            name = os.path.basename(dirpath) if dirpath != root else label
            found.append((name, dirpath))
            dirnames[:] = []  # a pack's subdirs are its own contents
            continue
        for fn in sorted(filenames):
            if fn.lower().endswith(ARCHIVE_SUFFIXES):
                stem = re.sub(r"\.[^.]+$", "", fn)
                out = tempfile.mkdtemp(prefix=stem + "-", dir=tmp)
                try:
                    safe_extract(os.path.join(dirpath, fn), out)
                except zipfile.BadZipFile:
                    die(f"{fn} is not a valid zip (still being written?)")
                found.extend(find_packs(out, stem, tmp))
    return found


def classify(manifest, name):
    types = {m.get("type") for m in manifest.get("modules", [])}
    if types & SKIP_MODULE_TYPES:
        return None
    if types & RESOURCE_MODULE_TYPES:
        return "resource_packs"
    return "behavior_packs"


def sanitize(name):
    name = re.sub(r"[^A-Za-z0-9._-]+", "-", name).strip("-.")
    return name or "pack"


def discover(addons, tmp):
    """Return {kind: [(install_name, src_dir, header)]} and fail on bad packs."""
    packs = {"behavior_packs": [], "resource_packs": []}
    seen_uuids = {}
    taken = set()
    for name, src in find_packs(addons, "addon", tmp):
        try:
            manifest = load_manifest(os.path.join(src, "manifest.json"))
            header = manifest["header"]
            header["uuid"], header["version"]
        except (json.JSONDecodeError, KeyError, TypeError) as e:
            die(f"{name}/manifest.json is unusable ({e})")

        kind = classify(manifest, name)
        if kind is None:
            print(f"  -- skipping {name}: not a behavior or resource pack")
            continue

        for uuid in [header["uuid"]] + [m.get("uuid") for m in manifest.get("modules", [])]:
            if uuid in seen_uuids and seen_uuids[uuid][1] != src:
                die(f"UUID {uuid} is used by both {seen_uuids[uuid][0]!r} and {name!r}; "
                    "every pack and module needs its own")
            seen_uuids[uuid] = (name, src)

        install_name = sanitize(name)
        if install_name in taken:
            install_name = f"{install_name}-{header['uuid'][:8]}"
        taken.add(install_name)
        packs[kind].append((install_name, src, header))
    return packs


def load_state(path):
    try:
        with open(path) as f:
            return json.load(f)
    except (OSError, json.JSONDecodeError):
        return {"behavior_packs": [], "resource_packs": []}


def write_json(path, obj):
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(obj, f, indent=2)
    os.replace(tmp, path)


def install(packs, data, previously):
    for kind in ("behavior_packs", "resource_packs"):
        root = os.path.join(data, kind)
        os.makedirs(root, exist_ok=True)
        wanted = {n for n, _, _ in packs[kind]}
        for stale in set(previously.get(kind, [])) - wanted:
            path = os.path.join(root, stale)
            if os.path.isdir(path):
                shutil.rmtree(path)
                print(f"  -- removed {kind}/{stale}")
        for name, src, _ in packs[kind]:
            dest = os.path.join(root, name)
            if os.path.isdir(dest):
                shutil.rmtree(dest)
            shutil.copytree(src, dest)


def activate(world_dir, packs):
    """Point one world at a set of packs. BDS ignores anything not listed here."""
    os.makedirs(world_dir, exist_ok=True)
    for kind, out_name in (("behavior_packs", "world_behavior_packs.json"),
                           ("resource_packs", "world_resource_packs.json")):
        entries = [{"pack_id": h["uuid"], "version": h["version"]} for _, _, h in packs[kind]]
        write_json(os.path.join(world_dir, out_name), entries)
        names = ", ".join(n for n, _, _ in packs[kind]) or "none"
        print(f"  {out_name}: {len(entries)} pack(s) [{names}]")


def main():
    if len(sys.argv) != 5:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    addons, data, state, level = sys.argv[1:5]
    os.makedirs(addons, exist_ok=True)
    os.makedirs(state, exist_ok=True)
    state_file = os.path.join(state, "installed-packs.json")

    with tempfile.TemporaryDirectory(prefix="mc-addons-") as tmp:
        packs = discover(addons, tmp)
        install(packs, data, load_state(state_file))

    activate(os.path.join(data, "worlds", level), packs)
    write_json(state_file, {k: [n for n, _, _ in v] for k, v in packs.items()})


if __name__ == "__main__":
    main()
