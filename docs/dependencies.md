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

The **RichString** library above is a compile-time requirement and is **not** distributed by Anywhere Software; it is a community library by Andrew Graham (package `anywheresoftware.b4a.agraham.richstring`). The repository ships the `.jar` + `.xml` pair in the project-local `Libraries/` folder. `B4ABuilder` does not scan that folder automatically: `tools/b4a_build.ps1` registers it through the B4A INI `AdditionalLibrariesFolder` setting before compiling. When building from the B4A GUI, add RichString to the IDE library list (global `Libraries` folder or the configured additional-libraries folder).

Provenance: the files were extracted from `RichString1.4.zip`, the final version that the author posted on the B4X Community thread *"RichString library."* (<https://www.b4x.com/android/forum/threads/richstring-library.10680/>). The download is behind login, so the binary was recovered from an Internet Archive snapshot of the attachment: <https://web.archive.org/web/20230330041809id_/https://www.b4x.com/android/forum/attachments/richstring-zip.51697/>. Before a public release, confirm the upstream license and redistribution permission.

## Vendored archives

The repository contains:

| Archive | Purpose | Repository status |
|---|---|---|
| `Install/AHViewPager3_00.zip` | AHViewPager library package | Vendored |
| `Install/RSPopupMenu.zip` | RSPopupMenu library package | Vendored |
| `Libraries/RichString.jar` + `Libraries/RichString.xml` | RichString library package (jar + manifest) | Vendored |

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
