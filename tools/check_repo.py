#!/usr/bin/env python3
"""Repository sanity checks for AeroCalculator."""

from __future__ import annotations

import argparse
import hashlib
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECT = ROOT / "AeroCalculator.b4a"

FORBIDDEN_SUFFIXES = {
    ".keystore", ".jks", ".p12", ".pfx", ".pem", ".key",
    ".pk8", ".pepk", ".apk", ".aab",
}
FORBIDDEN_NAMES = {"google-services.json"}
REQUIRED_DOCS = {
    "docs/software_requirements.md",
    "docs/calculations.md",
    "docs/units_and_conventions.md",
    "docs/architecture.md",
    "docs/verification.md",
    "docs/dependencies.md",
    "docs/user_guide.md",
    "docs/release_checklist.md",
}
REQUIRED_VENDORED = {
    "Install/AHViewPager3_00.zip",
    "Install/RSPopupMenu.zip",
}


def parse_project(text: str) -> tuple[list[str], list[str], list[str]]:
    modules = [
        m.group(1).strip()
        for m in re.finditer(r"^Module\d+=(.+)$", text, re.MULTILINE)
    ]
    assets = [
        m.group(1).strip()
        for m in re.finditer(r"^File\d+=(.+)$", text, re.MULTILINE)
    ]
    libraries = [
        m.group(1).strip()
        for m in re.finditer(r"^Library\d+=(.+)$", text, re.MULTILINE)
    ]
    return modules, assets, libraries


def check_required_files(errors: list[str]) -> None:
    required = {
        "AGENTS.md",
        "README.md",
        "LICENSE.txt",
        "CHANGELOG.md",
        "THIRD_PARTY_NOTICES.md",
    } | REQUIRED_DOCS | REQUIRED_VENDORED
    for rel in sorted(required):
        if not (ROOT / rel).is_file():
            errors.append(f"missing required file: {rel}")


def check_project(errors: list[str], warnings: list[str]) -> None:
    if not PROJECT.is_file():
        errors.append("missing AeroCalculator.b4a")
        return

    text = PROJECT.read_text(encoding="utf-8-sig")
    modules, assets, libraries = parse_project(text)

    for module in modules:
        path = ROOT / f"{module}.bas"
        if not path.is_file():
            errors.append(f"declared B4A module is missing: {path.name}")

    files_dir = ROOT / "Files"
    asset_names = (
        {p.name.lower() for p in files_dir.iterdir() if p.is_file()}
        if files_dir.is_dir()
        else set()
    )
    for asset in assets:
        if asset.lower() not in asset_names:
            errors.append(f"declared B4A asset is missing from Files/: {asset}")

    if len(modules) != len(set(m.lower() for m in modules)):
        errors.append("duplicate B4A module declarations")
    if len(assets) != len(set(a.lower() for a in assets)):
        errors.append("duplicate B4A asset declarations")
    if len(libraries) != len(set(l.lower() for l in libraries)):
        errors.append("duplicate B4A library declarations")

    target_match = re.search(r'targetSdkVersion=[^0-9]*(\d+)', text)
    if target_match is None:
        warnings.append("could not determine targetSdkVersion from B4A manifest metadata")
    elif int(target_match.group(1)) < 36:
        warnings.append(
            f"targetSdkVersion is {target_match.group(1)}; Google Play requires "
            "API 36 for ordinary mobile app updates from 2026-08-31. Upgrade "
            "with B4A 13.7+ and verify edge-to-edge behavior before release."
        )

    if "T_std=310.65+1*(Hp-20000)/1000" in text:
        errors.append(
            "historical invalid 20-32 km atmosphere temperature expression reappeared"
        )


def check_security(errors: list[str]) -> None:
    tracked = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=ROOT,
        check=True,
        capture_output=True,
    ).stdout.split(b"\0")
    for raw_path in tracked:
        if not raw_path:
            continue
        path = ROOT / raw_path.decode("utf-8", errors="surrogateescape")
        if not path.is_file():
            continue
        if (
            path.suffix.lower() in FORBIDDEN_SUFFIXES
            or path.name.lower() in FORBIDDEN_NAMES
        ):
            errors.append(
                "forbidden generated/credential-like file is tracked: "
                f"{path.relative_to(ROOT)}"
            )


def check_skill_mirrors(errors: list[str]) -> None:
    a = ROOT / ".agents/skills/writing-rules/SKILL.md"
    b = ROOT / ".claude/skills/writing-rules/SKILL.md"
    if a.is_file() and b.is_file() and a.read_bytes() != b.read_bytes():
        errors.append("writing-rules skill mirrors differ")


def check_duplicate_assets(warnings: list[str]) -> None:
    seen: dict[str, Path] = {}
    for folder in ("Files", "Icons"):
        d = ROOT / folder
        if not d.is_dir():
            continue
        for p in d.iterdir():
            if not p.is_file():
                continue
            digest = hashlib.sha256(p.read_bytes()).hexdigest()
            if digest in seen and seen[digest].name.lower() != p.name.lower():
                warnings.append(
                    "duplicate asset content: "
                    f"{seen[digest].relative_to(ROOT)} and {p.relative_to(ROOT)}"
                )
            else:
                seen[digest] = p


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--strict-warnings", action="store_true")
    args = parser.parse_args()

    errors: list[str] = []
    warnings: list[str] = []
    check_required_files(errors)
    check_project(errors, warnings)
    check_security(errors)
    check_skill_mirrors(errors)
    check_duplicate_assets(warnings)

    for item in warnings:
        print(f"WARNING: {item}")
    for item in errors:
        print(f"ERROR: {item}")

    if errors or (args.strict_warnings and warnings):
        return 1
    print(f"OK: repository sanity passed with {len(warnings)} warning(s)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
