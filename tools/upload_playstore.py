#!/usr/bin/env python3
"""Upload AeroCalculator Android App Bundle (.aab) to Google Play Console.

Uses the official Google Play Developer API (Android Publisher v3) to upload
an AAB bundle and assign it to a specified release track (internal, alpha,
beta, or production).

SECURITY REQUIREMENT:
    Do NOT commit credentials or service account JSON keys to git.
    Store keys in the git-ignored 'Key/' directory or specify via the
    GOOGLE_PLAY_SERVICE_ACCOUNT_JSON environment variable.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# ==============================================================================
# FALLBACK CONFIGURATION (Used when running without CLI arguments)
# You can edit these variables directly here to run with:
#   python tools/upload_playstore.py
# ==============================================================================
TRACK = "production"            # 'internal', 'alpha', 'beta', or 'production'
STATUS = "completed"            # 'completed', 'draft', 'inProgress', or 'halted'
PACKAGE_NAME = "flightdyn.aerocalculator"
AAB_PATH = None                 # None = auto-detect Objects/AeroCalculator.aab
KEY_FILE_PATH = None            # None = auto-detect Key/play_store_service_account.json
USER_FRACTION = None            # Float 0.0 to 1.0 (for staged rollout if STATUS='inProgress')
RELEASE_NAME = None             # None = auto-detect from AeroCalculator.b4a VersionName
RELEASE_NOTES_TEXT = None       # None = use release notes file below
RELEASE_NOTES_FILE = None       # None = auto-detect docs/release_notes_*.txt
LANGUAGE = "pt-BR"              # Fallback language code
VALIDATE_ONLY = False           # True = Dry-run validation only (does not publish)

DEFAULT_AAB = ROOT / "Objects" / "AeroCalculator.aab"
DEFAULT_PACKAGE = "flightdyn.aerocalculator"
DEFAULT_KEY_NAMES = [
    "play_store_service_account.json",
    "service_account.json",
    "google-play-service-account.json",
    "api-key.json",
]
SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]


def find_default_key_file() -> Path | None:
    """Find a service account JSON file in the git-ignored Key/ directory."""
    key_dir = ROOT / "Key"
    if not key_dir.is_dir():
        return None

    # Check common explicit filenames first
    for name in DEFAULT_KEY_NAMES:
        candidate = key_dir / name
        if candidate.is_file():
            return candidate

    # Search for any JSON file containing "service_account" type
    for json_file in key_dir.glob("*.json"):
        try:
            data = json.loads(json_file.read_text(encoding="utf-8"))
            if data.get("type") == "service_account":
                return json_file
        except Exception:
            continue

    return None


def assert_key_not_tracked_by_git(key_path: Path) -> None:
    """Verify that the key file is not tracked by Git."""
    try:
        rel = key_path.relative_to(ROOT)
    except ValueError:
        # Key file is outside repository, so it cannot be tracked
        return

    res = subprocess.run(
        ["git", "ls-files", "--error-unmatch", str(rel)],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if res.returncode == 0:
        print(
            f"ERROR: Security violation! The credential file '{rel}' is tracked by Git.\n"
            "Untrack it immediately with: git rm --cached <file>",
            file=sys.stderr,
        )
        sys.exit(1)


def read_project_version() -> tuple[int | None, str | None]:
    """Read VersionCode and VersionName from AeroCalculator.b4a."""
    b4a_file = ROOT / "AeroCalculator.b4a"
    if not b4a_file.is_file():
        return None, None

    text = b4a_file.read_text(encoding="utf-8-sig", errors="ignore")
    vc_match = re.search(r"^\s*#VersionCode:\s*(\d+)", text, re.MULTILINE)
    vn_match = re.search(r"^\s*#VersionName:\s*([^\r\n]+)", text, re.MULTILINE)

    version_code = int(vc_match.group(1)) if vc_match else None
    version_name = vn_match.group(1).strip() if vn_match else None
    return version_code, version_name


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Upload AeroCalculator .aab to Google Play Store."
    )
    effective_aab = AAB_PATH or DEFAULT_AAB
    parser.add_argument(
        "--aab",
        type=Path,
        default=effective_aab,
        help=f"Path to the .aab bundle file (fallback: {effective_aab})",
    )
    parser.add_argument(
        "--package-name",
        default=PACKAGE_NAME,
        help=f"Android package name (fallback: {PACKAGE_NAME})",
    )
    parser.add_argument(
        "--key-file",
        type=Path,
        default=KEY_FILE_PATH,
        help=(
            "Path to the Google Cloud Service Account JSON key. "
            "If omitted, checks fallback KEY_FILE_PATH, GOOGLE_PLAY_SERVICE_ACCOUNT_JSON env var, or Key/ directory."
        ),
    )
    parser.add_argument(
        "--track",
        choices=["internal", "alpha", "beta", "production"],
        default=TRACK,
        help=f"Target release track (fallback: {TRACK})",
    )
    parser.add_argument(
        "--status",
        choices=["completed", "draft", "inProgress", "halted"],
        default=STATUS,
        help=(
            f"Release status: 'completed' (active), 'draft' (draft for review), "
            f"'inProgress' (staged rollout). Fallback: {STATUS}"
        ),
    )
    parser.add_argument(
        "--user-fraction",
        type=float,
        default=USER_FRACTION,
        help="Fraction of users (0.0 to 1.0) for staged rollout when --status=inProgress",
    )
    parser.add_argument(
        "--release-name",
        default=RELEASE_NAME,
        help="Optional name for the release (e.g. 'v3.22'). Defaults to B4A VersionName.",
    )
    parser.add_argument(
        "--release-notes",
        default=RELEASE_NOTES_TEXT,
        help="Release notes text to display in Google Play.",
    )
    parser.add_argument(
        "--release-notes-file",
        type=Path,
        default=RELEASE_NOTES_FILE,
        help="Path to a text file containing release notes.",
    )
    parser.add_argument(
        "--language",
        default=LANGUAGE,
        help=f"Language code for release notes (fallback: {LANGUAGE}).",
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        default=VALIDATE_ONLY,
        help="Validate the edit and bundle without committing to Google Play.",
    )
    return parser.parse_args()


def parse_release_notes(text: str, default_lang: str = "pt-BR") -> list[dict[str, str]]:
    """Parse release notes in XML-style tags (<en-US>...</en-US>) or raw string."""
    matches = re.findall(
        r"<([a-zA-Z]{2}(?:-[a-zA-Z0-9]{2,})?)>\s*([\s\S]*?)\s*</\1>", text
    )
    if matches:
        return [{"language": lang, "text": body.strip()} for lang, body in matches]
    return [{"language": default_lang, "text": text.strip()}]


def main() -> int:
    args = parse_args()

    # Verify AAB file exists
    aab_path = args.aab.resolve()
    if not aab_path.is_file():
        print(f"ERROR: AAB bundle file not found: {aab_path}", file=sys.stderr)
        print("Run the B4A build first to produce the bundle.", file=sys.stderr)
        return 1

    file_size_mb = aab_path.stat().st_size / (1024 * 1024)
    print(f"--> Found AAB bundle: {aab_path} ({file_size_mb:.2f} MB)")

    # Read Version metadata from project
    proj_vc, proj_vn = read_project_version()
    if proj_vc and proj_vn:
        print(f"--> B4A Project Target: VersionCode {proj_vc}, VersionName '{proj_vn}'")

    release_name = args.release_name or (f"v{proj_vn}" if proj_vn else None)

    # Read Release Notes
    release_notes_raw = args.release_notes
    if not release_notes_raw and args.release_notes_file:
        if args.release_notes_file.is_file():
            release_notes_raw = args.release_notes_file.read_text(encoding="utf-8").strip()
        else:
            print(
                f"WARNING: Release notes file '{args.release_notes_file}' not found.",
                file=sys.stderr,
            )
    elif not release_notes_raw:
        # Check default files in docs/
        candidate_notes = [
            ROOT / "docs" / f"release_notes_{proj_vn}.txt" if proj_vn else None,
            ROOT / "docs" / "release_notes_3.22.txt",
            ROOT / "docs" / "release_notes.txt",
        ]
        for cn in candidate_notes:
            if cn and cn.is_file():
                release_notes_raw = cn.read_text(encoding="utf-8").strip()
                print(f"--> Using default release notes file: {cn.relative_to(ROOT)}")
                break

    parsed_release_notes: list[dict[str, str]] = []
    if release_notes_raw:
        parsed_release_notes = parse_release_notes(release_notes_raw, default_lang=args.language)
        print(f"--> Parsed release notes for {len(parsed_release_notes)} language(s):")
        for entry in parsed_release_notes:
            print(f"    - [{entry['language']}] {entry['text'].splitlines()[0]}")

    # Locate Service Account key
    key_file = args.key_file
    if key_file is None:
        env_key = os.environ.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON") or os.environ.get(
            "GOOGLE_APPLICATION_CREDENTIALS"
        )
        if env_key:
            key_file = Path(env_key)
        else:
            key_file = find_default_key_file()

    if key_file is None or not key_file.is_file():
        print("\n" + "=" * 70, file=sys.stderr)
        print("ERROR: Google Play Service Account JSON key not found.", file=sys.stderr)
        print("=" * 70, file=sys.stderr)
        print(
            "\nTo upload via API, you need a Google Cloud Service Account key:\n"
            "  1. In Google Cloud Console, create a Service Account.\n"
            "  2. In Google Play Console -> Settings -> API Access, grant the account\n"
            "     'Release Manager' or 'Admin' permissions.\n"
            "  3. Download the service account JSON key.\n"
            "  4. Place it in the git-ignored folder:\n"
            "     'Key/play_store_service_account.json'\n"
            "     OR pass via argument: --key-file <path_to_key.json>\n"
            "     OR set environment variable: GOOGLE_PLAY_SERVICE_ACCOUNT_JSON\n",
            file=sys.stderr,
        )
        return 1

    key_path = key_file.resolve()
    assert_key_not_tracked_by_git(key_path)
    print(f"--> Using service account key: {key_path.name} (secured)")

    # Lazy-load Google API libraries to report clear errors if missing
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        from googleapiclient.errors import HttpError
        from googleapiclient.http import MediaFileUpload
    except ImportError as exc:
        print(
            f"ERROR: Required Google API libraries are missing ({exc}).\n"
            "Install them with: pip install google-api-python-client google-auth",
            file=sys.stderr,
        )
        return 1

    try:
        print("--> Authenticating with Google Play Developer API...")
        credentials = service_account.Credentials.from_service_account_file(
            str(key_path), scopes=SCOPES
        )
        service = build("androidpublisher", "v3", credentials=credentials)

        print(f"--> Opening new edit session for package '{args.package_name}'...")
        edit_request = service.edits().insert(packageName=args.package_name, body={})
        edit = edit_request.execute()
        edit_id = edit["id"]
        print(f"    Session Edit ID: {edit_id}")

        print(f"--> Uploading AAB bundle ({file_size_mb:.2f} MB)...")
        media = MediaFileUpload(
            str(aab_path), mimetype="application/octet-stream", resumable=True
        )
        upload_request = service.edits().bundles().upload(
            packageName=args.package_name, editId=edit_id, media_body=media
        )
        bundle_response = upload_request.execute()
        uploaded_vc = bundle_response.get("versionCode")
        sha256 = bundle_response.get("sha256")
        print(f"    Upload complete! VersionCode: {uploaded_vc} (SHA256: {sha256[:16]}...)")

        # Configure release
        release_data = {
            "versionCodes": [str(uploaded_vc)],
            "status": args.status,
        }
        if release_name:
            release_data["name"] = release_name
        if parsed_release_notes:
            release_data["releaseNotes"] = parsed_release_notes
        if args.status == "inProgress" and args.user_fraction is not None:
            release_data["userFraction"] = args.user_fraction

        print(f"--> Assigning VersionCode {uploaded_vc} to track '{args.track}' (status: {args.status})...")
        track_body = {"track": args.track, "releases": [release_data]}
        service.edits().tracks().update(
            packageName=args.package_name,
            editId=edit_id,
            track=args.track,
            body=track_body,
        ).execute()

        if args.validate_only:
            print("--> Validating edit session (dry-run)...")
            service.edits().validate(
                packageName=args.package_name, editId=edit_id
            ).execute()
            print("\n[OK] Validation successful! (No changes were published).")
        else:
            print("--> Committing changes to Google Play...")
            service.edits().commit(
                packageName=args.package_name, editId=edit_id
            ).execute()
            print(
                f"\n[OK] Successfully published VersionCode {uploaded_vc} "
                f"to Google Play track '{args.track}'!"
            )

        return 0

    except HttpError as exc:
        print(f"\nERROR: Google Play API request failed (HTTP {exc.resp.status}):", file=sys.stderr)
        try:
            err_data = json.loads(exc.content.decode("utf-8"))
            err_message = err_data.get("error", {}).get("message", str(exc))
            print(f"Details: {err_message}", file=sys.stderr)
        except Exception:
            print(f"Details: {exc.content.decode('utf-8', errors='replace')}", file=sys.stderr)

        if exc.resp.status in (401, 403):
            print(
                "\nHint: Ensure your Service Account has been added in Google Play Console\n"
                "(Settings -> API Access) with permission to manage releases for this app.",
                file=sys.stderr,
            )
        elif exc.resp.status == 404:
            print(
                f"\nHint: App package '{args.package_name}' was not found in Play Console.\n"
                "Ensure the app was already created once in the Google Play Console.",
                file=sys.stderr,
            )
        return 1

    except Exception as exc:
        print(f"\nERROR: Unexpected failure during upload: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
