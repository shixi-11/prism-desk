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
5. With existing publication authorization, run `npm run release:publish`. The script reads the existing GitHub Git credential only in memory, creates an annotated `vX.Y.Z` tag, and publishes one bilingual Release. It refuses inconsistent versions, missing notes, an unpushed commit, or replacing an existing published version. Never print or save credentials.
6. Verify the public tag, Release body, and update discovery. Report the actual version and Release link, plus material verification limits. Do not say that an already running app has updated until it really has.

`release.json` is the current release-note source; the Git history and GitHub Releases preserve prior versions. The publisher generates both language sections from it. The updater displays the corresponding notes, using English for languages without a translated note section.

No additional archive or checksum files are created unless requested. The current distribution is a source installation, not a standalone installer; say that clearly on the Release page.

## References

- [VS Code update controls](https://code.visualstudio.com/docs/supporting/faq) and [release notes](https://code.visualstudio.com/updates/archive) illustrate separate update settings and version history.
- [Firefox's check-but-choose installation option](https://firefox-source-docs.mozilla.org/toolkit/mozapps/update/docs/HowToDisable.html) illustrates user-controlled installation. Other apps' defaults vary; do not describe all applications as manual-update-only.
- [GitHub Releases API](https://docs.github.com/en/rest/releases/releases) distinguishes published Releases from ordinary tags and commits.
