#!/usr/bin/env python3
"""Print a compact inventory of the B4A project."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def source_subs(path: Path) -> list[str]:
    text = path.read_text(encoding="utf-8-sig")
    return [m.group(1) for m in re.finditer(r"^\s*Sub\s+([A-Za-z0-9_]+)", text, re.MULTILINE | re.IGNORECASE)]


def main() -> int:
    project = (ROOT / "AeroCalculator.b4a").read_text(encoding="utf-8-sig")
    modules = [m.group(1).strip() for m in re.finditer(r"^Module\d+=(.+)$", project, re.MULTILINE)]
    libraries = [m.group(1).strip() for m in re.finditer(r"^Library\d+=(.+)$", project, re.MULTILINE)]
    assets = [m.group(1).strip() for m in re.finditer(r"^File\d+=(.+)$", project, re.MULTILINE)]

    sources = [ROOT / "AeroCalculator.b4a"] + [ROOT / f"{name}.bas" for name in modules]
    data = {
        "modules": modules,
        "libraries": libraries,
        "assets": assets,
        "sources": {
            p.name: {
                "bytes": p.stat().st_size,
                "sub_count": len(source_subs(p)),
                "subs": source_subs(p),
            }
            for p in sources if p.is_file()
        },
    }
    print(json.dumps(data, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
