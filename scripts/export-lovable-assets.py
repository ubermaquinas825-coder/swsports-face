#!/usr/bin/env python3
"""Preserve original public images at their existing URLs for standalone hosting."""
import hashlib
import json
from pathlib import Path
import subprocess
import tempfile

root = Path(__file__).resolve().parent.parent
origin = "https://swsports-face.lovable.app"
records = []
for pointer in sorted((root / "src/assets").glob("*.asset.json")):
    asset = json.loads(pointer.read_text())
    relative = asset["url"]
    if not relative.startswith("/__l5e/assets-v1/") or ".." in relative.split("/"):
        raise ValueError(f"Invalid asset pointer: {pointer.name}")
    target = root / "public" / relative.lstrip("/")
    target.parent.mkdir(parents=True, exist_ok=True)
    if not target.exists():
        with tempfile.NamedTemporaryFile(dir=target.parent, delete=False) as tmp:
            temp = Path(tmp.name)
        try:
            subprocess.run(["curl", "--fail", "--silent", "--show-error", "--location", "--proto", "=https", "--max-time", "90", origin + relative, "--output", str(temp)], check=True)
            content = temp.read_bytes()
            if len(content) != asset["size"] or not content.startswith(b"\x89PNG\r\n\x1a\n"):
                raise ValueError(f"Unexpected size or format: {pointer.name}")
            temp.chmod(0o644)
            temp.replace(target)
        finally:
            temp.unlink(missing_ok=True)
    content = target.read_bytes()
    if len(content) != asset["size"] or not content.startswith(b"\x89PNG\r\n\x1a\n"):
        raise ValueError(f"Existing asset differs: {target.name}")
    records.append({"url": relative, "bytes": len(content), "sha256": hashlib.sha256(content).hexdigest()})
    print(f"Verified original: {target.name} ({len(content)} bytes)")
(root / "docs/asset-manifest.json").write_text(json.dumps(records, indent=2) + "\n")
