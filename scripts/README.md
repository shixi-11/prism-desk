# Developer scripts

Run scripts from a checkout with Node.js 20 or later. Paths to the project are resolved from the script location. `start.ps1` launches the local Electron installation; `build-host.ps1` builds the Windows process host using the installed .NET Framework compiler.

## Dependencies

UI checks use `playwright`; icon generation uses `sharp`. Install these packages locally, or set `PRISM_NODE_MODULES` to an existing `node_modules` directory containing them. No personal runtime location is embedded in the scripts.

`gemini-login.ps1` discovers Node from `PRISM_NODE`, then `PATH`, then an optional locally installed Codex runtime. Google OAuth uses the configured Gemini profile and `geminiEntry`. If several Gemini profiles exist, set `PRISM_GEMINI_PROFILE` explicitly. `PRISM_GEMINI_ENTRY` can override the CLI entry. Login opens the default browser and never enables API billing.

## Optional live checks

These checks use real configured subscription accounts and some consume model allowance. They are not part of the offline unit suite. Set the relevant environment variables to profile IDs from your own configuration (`PRISM_CONFIG` can select a configuration file):

| Variable | Use |
| --- | --- |
| `PRISM_TEST_CODEX_FIRST` | Initial Codex account; also the target of a Claude handoff |
| `PRISM_TEST_CODEX_SECOND` | Second Codex account for continuity checks |
| `PRISM_TEST_EXHAUSTED_CODEX` | Account whose allowance is already confirmed exhausted |
| `PRISM_TEST_ALLOW_AUTO_RELAY=1` | Explicitly allows the exhaustion check to use the configured relay pool |
| `PRISM_TEST_CLAUDE` | Claude account for live checks |
| `PRISM_TEST_GROK_FIRST` | Initial Grok account |
| `PRISM_TEST_GROK_SECOND` | Second Grok account |
| `PRISM_TEST_GROK_THIRD` | Third Grok account |
| `PRISM_TEST_GEMINI` | Gemini account for the continuity UI check |
| `PRISM_TEST_TASK_ID` | Existing fixture task for `claude-relay.cjs` |

All live account selections fail early when the required variable is missing or the configured provider does not match. Ordinary live checks disable automatic account relay. The dedicated exhaustion check requires an already exhausted account; it never manufactures exhaustion.

`live-relay.cjs` creates a fixture under `.local/relay-check`. `claude-relay.cjs` continues an explicitly selected task from that fixture. `claude-stop-live.cjs` creates an isolated review fixture; `claude-handoff-finish.cjs` continues its most recent run and verifies the configured Codex account. `grok-followup.cjs` requires a preceding successful `grok-relay.cjs` run. Skill-reading probes create their own harmless `SKILL.md` fixture and do not depend on a private assistant package.

The older live UI checks require the capabilities they assert: two usable Codex accounts and available reset credits (the native confirmation is cancelled), configured skills, and the relevant installed applications. `integration-ui-check.cjs` additionally requires one Grok account with a returned percentage and another with a returned period but unknown percentage. These are explicit environment-specific integration checks, not portable claims that every account provides those fields.

## Application probes

Application probes discover installed applications through the configured discovery module. For Resolve, `PRISM_RESOLVE_DIR`, `RESOLVE_SCRIPT_API`, and `PRISM_PYTHON` can override the installation directory, SDK root, and Python executable. Probes inspect existing interfaces; a connected SDK does not certify editing or rendering operations.

Keep `.local`, runtime outputs, screenshots containing private information, and live account configuration out of source control. No source script needs to be removed from the repository; the optional live checks must remain excluded from unattended CI unless its environment is deliberately configured.
