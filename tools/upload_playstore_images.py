#!/usr/bin/env python3
"""Upload AeroCalculator store listing screenshots and graphic assets to Google Play.

Uses the official Google Play Developer API (Android Publisher v3) to upload
screenshots and promotional graphics (phone, 7" tablet, 10" tablet, feature banner)
for specified listing languages.

SECURITY REQUIREMENT:
    Do NOT commit credentials or service account JSON keys to git.
    Store keys in the git-ignored 'Key/' directory or specify via the
    GOOGLE_PLAY_SERVICE_ACCOUNT_JSON environment variable.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

ROOT = Path(__file__).resolve().parents[1]

# Default paths
PACKAGE_NAME = "flightdyn.aerocalculator"
KEY_FILE = ROOT / "Key" / "play_store_service_account.json"
PHONE_DIR = ROOT / "Icons" / "Store" / "phone"
TABLET_7_DIR = ROOT / "Icons" / "Store" / "tablet_7"
TABLET_10_DIR = ROOT / "Icons" / "Store" / "tablet_10"
FEATURE_BANNER = ROOT / "Icons" / "Store" / "Banner_1024x500.png"
LANGUAGES = ["en-US", "pt-BR"]
SCOPES = ["https://www.googleapis.com/auth/androidpublisher"]


def assert_key_not_tracked_by_git(key_path: Path) -> None:
    """Verify that the key file is not tracked by Git."""
    try:
        rel = key_path.relative_to(ROOT)
    except ValueError:
        return

    res = subprocess.run(
        ["git", "ls-files", "--error-unmatch", str(rel)],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if res.returncode == 0:
        print(
            f"ERROR: Security violation! Credential file '{rel}' is tracked by Git.",
            file=sys.stderr,
        )
        sys.exit(1)


def upload_images(validate_only: bool = False) -> int:
    """Upload screenshots and feature banner to Google Play Console."""
    if not KEY_FILE.is_file():
        print(f"ERROR: Service account key not found at {KEY_FILE}", file=sys.stderr)
        return 1

    assert_key_not_tracked_by_git(KEY_FILE)

    if not PHONE_DIR.is_dir():
        print(f"ERROR: Phone screenshots directory not found: {PHONE_DIR}", file=sys.stderr)
        return 1

    phone_images = sorted(PHONE_DIR.glob("*.png"))
    tab7_images = sorted(TABLET_7_DIR.glob("*.png")) if TABLET_7_DIR.is_dir() else []
    tab10_images = sorted(TABLET_10_DIR.glob("*.png")) if TABLET_10_DIR.is_dir() else []

    print("--> Preparing store assets:")
    print(f"    - Phone screenshots: {len(phone_images)}")
    print(f"    - 7\" Tablet screenshots: {len(tab7_images)}")
    print(f"    - 10\" Tablet screenshots: {len(tab10_images)}")
    print(f"    - Feature graphic: {FEATURE_BANNER.name if FEATURE_BANNER.is_file() else 'None'}")
    print(f"    - Target languages: {', '.join(LANGUAGES)}")

    creds = service_account.Credentials.from_service_account_file(
        str(KEY_FILE),
        scopes=SCOPES,
    )
    service = build("androidpublisher", "v3", credentials=creds)

    print(f"--> Opening new edit session for package '{PACKAGE_NAME}'...")
    edit_req = service.edits().insert(packageName=PACKAGE_NAME, body={})
    edit = edit_req.execute()
    edit_id = edit["id"]
    print(f"    Edit Session ID: {edit_id}")

    try:
        for lang in LANGUAGES:
            print(f"\n--> Updating store listing for language: [{lang}]")

            # 1. Feature Graphic (1024x500 banner)
            if FEATURE_BANNER.is_file():
                print("    - Uploading feature graphic (1024x500)...")
                service.edits().images().deleteall(
                    packageName=PACKAGE_NAME,
                    editId=edit_id,
                    language=lang,
                    imageType="featureGraphic",
                ).execute()
                media = MediaFileUpload(str(FEATURE_BANNER), mimetype="image/png")
                service.edits().images().upload(
                    packageName=PACKAGE_NAME,
                    editId=edit_id,
                    language=lang,
                    imageType="featureGraphic",
                    media_body=media,
                ).execute()
                print("      [OK] Feature graphic updated.")

            # 2. Phone Screenshots
            if phone_images:
                print(f"    - Uploading {len(phone_images)} phone screenshots...")
                service.edits().images().deleteall(
                    packageName=PACKAGE_NAME,
                    editId=edit_id,
                    language=lang,
                    imageType="phoneScreenshots",
                ).execute()
                for idx, img_path in enumerate(phone_images, 1):
                    media = MediaFileUpload(str(img_path), mimetype="image/png")
                    res = service.edits().images().upload(
                        packageName=PACKAGE_NAME,
                        editId=edit_id,
                        language=lang,
                        imageType="phoneScreenshots",
                        media_body=media,
                    ).execute()
                    print(f"      [{idx}/{len(phone_images)}] {img_path.name}")

            # 3. 7" Tablet Screenshots
            if tab7_images:
                print(f"    - Uploading {len(tab7_images)} 7\" tablet screenshots...")
                service.edits().images().deleteall(
                    packageName=PACKAGE_NAME,
                    editId=edit_id,
                    language=lang,
                    imageType="sevenInchScreenshots",
                ).execute()
                for idx, img_path in enumerate(tab7_images, 1):
                    media = MediaFileUpload(str(img_path), mimetype="image/png")
                    res = service.edits().images().upload(
                        packageName=PACKAGE_NAME,
                        editId=edit_id,
                        language=lang,
                        imageType="sevenInchScreenshots",
                        media_body=media,
                    ).execute()
                    print(f"      [{idx}/{len(tab7_images)}] {img_path.name}")

            # 4. 10" Tablet Screenshots
            if tab10_images:
                print(f"    - Uploading {len(tab10_images)} 10\" tablet screenshots...")
                service.edits().images().deleteall(
                    packageName=PACKAGE_NAME,
                    editId=edit_id,
                    language=lang,
                    imageType="tenInchScreenshots",
                ).execute()
                for idx, img_path in enumerate(tab10_images, 1):
                    media = MediaFileUpload(str(img_path), mimetype="image/png")
                    res = service.edits().images().upload(
                        packageName=PACKAGE_NAME,
                        editId=edit_id,
                        language=lang,
                        imageType="tenInchScreenshots",
                        media_body=media,
                    ).execute()
                    print(f"      [{idx}/{len(tab10_images)}] {img_path.name}")

        if validate_only:
            print("\n--> Validating edit session (dry-run)...")
            service.edits().validate(packageName=PACKAGE_NAME, editId=edit_id).execute()
            print("\n[OK] Validation successful! (No changes were published).")
        else:
            print("\n--> Committing changes to Google Play...")
            service.edits().commit(packageName=PACKAGE_NAME, editId=edit_id).execute()
            print("\n[OK] Successfully published all screenshots and promotional assets to Google Play!")

        return 0

    except Exception as exc:
        print(f"\nERROR: Failed to update Google Play store assets: {exc}", file=sys.stderr)
        try:
            service.edits().delete(packageName=PACKAGE_NAME, editId=edit_id).execute()
            print("Edit session rolled back.")
        except Exception:
            pass
        return 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Validate changes with Google Play without publishing them.",
    )
    args = parser.parse_args()
    return upload_images(validate_only=args.validate_only)


if __name__ == "__main__":
    sys.exit(main())
