# Versioning and releases

These are repository rules for future contributors and agents. The owner requested versioned releases, clear update notes, and user-controlled installation on 2026-09-09.

## Version policy

Use `MAJOR.MINOR.PATCH`. The current 0.1 development line progresses through 0.1.1, 0.1.2, and so on for incremental public releases, including the current Grok integration. Do not jump to 0.2.0 simply because a release adds a feature. A MINOR or MAJOR milestone requires an explicitly agreed scope and version decision. Document incompatible changes and migration steps prominently.

Every **public release**, not every commit, gets a new version. Version 0.1.1 introduces Grok write/image support and the formal release update flow. Version 0.1.0 was distributed through main-branch updates; do not invent historical releases for its unversioned intermediate commits.

`package.json` is the software version source. `package-lock.json` and `release.json` must match. Window titles, update status, protocol metadata, and generated executable metadata use that source. Do not reuse a version for a different released build.

## Update behavior

1. Check the latest published stable GitHub Release. Ignore draft releases, prereleases, and ordinary main-branch commits.
2. Compare its numeric version with the installed package version. A different Git hash alone does not prompt an update.
3. Display installed and available versions, release date, and readable change notes.
4. Let the user select **Download and prepare**, or **Later** and continue working. Checking itself never downloads or installs software.
5. Install only after **Update and restart**. Preserve drafts, task history, account settings, and the previous installation; keep existing busy-work and rollback checks.

The 0.1.0 updater still follows main until its first upgrade. Once users install 0.1.1, subsequent checks follow formal Releases. Do not claim that publishing new source changes the behavior of already running older versions.

## Publishing

1. Read `AGENTS.md`, inspect current source and Git status, and check the latest GitHub Release before selecting the next version. Preserve unrelated uncommitted work.
2. Increment the version with `npm version patch --no-git-tag-version` for the current 0.1.x line. Use a minor or major increment only for an agreed milestone. Update `release.json` with the same version, date, and concrete English/Chinese changes. Explain user-visible benefits and material limitations; do not copy raw commit logs or claim untested capabilities.
3. Run `npm run release:check`, affected tests, and `npm run build`. For update changes, verify the displayed versions and notes, choosing Later without downloading, preparing only on request, and restart safety. For desktop metadata changes, verify the generated executable in an isolated build instead of overwriting a running executable.
4. Commit the complete release and push the verified commit to `main`. Development commits alone are not a public release announcement.
5. With existing publication authorization, run `npm run release:publish`. The script reads the configured GitHub credential into memory only and never prints or saves it. It requires the verified commit to be synchronized with `main`, creates or reuses the immutable annotated `vX.Y.Z` tag, and creates a draft Release before uploading assets. For a release with `distribution`, it hashes each local installer within its configured size bound, uploads missing assets one at a time, and compares GitHub's asset name, size, and SHA-256 digest with the local file. It publishes with `make_latest` only after all expected assets and the bilingual body have been verified. An existing same-content draft can be resumed; an asset already on that draft is accepted only when its size and digest match. Conflicting or unexpected assets stop publication without replacing them. A published release is an idempotent success only when its tag target, body, and complete asset set match. Never move a tag, overwrite an asset, or publish a partial Release.
6. Verify the public tag, Release body, three asset names, sizes and digests, and latest-release status. Report the actual version and Release link, plus material verification limits. Do not say that an already running app has updated until it really has.

## Installer distribution

For the v0.1.44 installer release, `release.json` lists exactly `windows-x64`, `mac-arm64`, and `mac-x64` under `distribution`. Before publishing, the corresponding files must exist locally at `.local/installer/Prism-Setup.exe`, `.local/installer/Prism-arm64.dmg`, and `.local/installer/Prism-x64.dmg`. The publisher enforces bounded, non-zero file sizes and SHA-256 integrity; it does not create archives or checksum sidecars.

The generated Release body links the Windows x64 NSIS installer and both Mac disk images. Windows users double-click `Prism-Setup.exe`; Git and Node.js are not required. Windows may warn that the unsigned installer has an unknown publisher. Mac users choose the disk image for Apple silicon or Intel, open it, and drag Prism to Applications. The Mac builds have an ad-hoc signature but no Apple Developer ID signature or notarization, so macOS may block the first launch; users who choose to open the app can allow it in System Settings → Privacy & Security. Mac updates remain a manual download and DMG install; the Release must not imply that the app installs Mac updates automatically.

Prism does not bundle third-party CLIs, accounts, or private Taichu materials. Users install the official Codex, Claude Code and/or Grok CLI separately and sign in with the appropriate subscription. Release notes created before installer distribution may omit `distribution`; they keep the legacy source-install Release body, and the release check continues to accept them.

`release.json` is the current release-note source; the Git history and GitHub Releases preserve prior versions. The publisher generates both language sections from it. The updater displays the corresponding notes, using English for languages without a translated note section.

No additional archive or checksum files are created unless requested. Releases without a `distribution` field retain the historical source-install instructions. Installer releases must describe the actual attached platform assets and their signing status accurately.

## References

- [VS Code update controls](https://code.visualstudio.com/docs/supporting/faq) and [release notes](https://code.visualstudio.com/updates/archive) illustrate separate update settings and version history.
- [Firefox's check-but-choose installation option](https://firefox-source-docs.mozilla.org/toolkit/mozapps/update/docs/HowToDisable.html) illustrates user-controlled installation. Other apps' defaults vary; do not describe all applications as manual-update-only.
- [GitHub Releases API](https://docs.github.com/en/rest/releases/releases) distinguishes published Releases from ordinary tags and commits.
