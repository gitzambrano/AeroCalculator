# Dependencies

## B4A environment

AeroCalculator is a Basic4android project. The repository currently declares these libraries in `AeroCalculator.b4a`:

- AHViewPager
- Animation
- Core
- GPS
- IME
- Phone
- PreferenceActivity
- Reflection
- RichString
- RSPopupMenu
- RuntimePermissions

The exact B4A version used for a release should be recorded in the release notes.

## Vendored archives

The repository contains:

| Archive | Purpose | Repository status |
|---|---|---|
| `Install/AHViewPager3_00.zip` | AHViewPager library package | Vendored |
| `Install/RSPopupMenu.zip` | RSPopupMenu library package | Vendored |

Before a public release, confirm the upstream license and redistribution permission for each vendored archive. Record the upstream project URL, version, author, and license when verified.

Do not infer a license from the fact that an archive is publicly downloadable.

## Python verification dependencies

The portable verification suite uses only the Python standard library. This keeps CI independent of application tooling.

## Android and Java

The README gives the supported B4A, Android SDK, and JDK expectations. Update the README and this file together when the build toolchain changes.

## Security

Never commit:

- signing keystores;
- private certificates;
- passwords;
- service-account credentials;
- Play Console credentials;
- production APK/AAB artifacts.

The repository `.gitignore` already excludes common forms. `tools/check_repo.py` provides an additional sanity check.
