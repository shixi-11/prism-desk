# Prism Desk · 棱镜

<img src="src/assets/prism-icon.svg" width="80" height="80" alt="Prism Desk">

[English](README.md) · [简体中文](README.zh-CN.md)

Created by [Shixi Lin](https://shixilin.com/).

Prism Desk is a Windows workspace for subscription CLIs. When one account runs out of allowance, you can move the task to another without rebuilding its conversation and progress notes by hand. The project folder stays the same.

### Versions and downloads

**[Latest release](https://github.com/shixi-11/prism-desk/releases/latest)** · **[Installation guide](#install)**

Prism currently ships as a **Windows source installation**. No standalone `.exe` or `.msi` installer is published. GitHub’s “Source code” downloads contain source files; follow the installation guide to build and launch the desktop app. Each stable release has one version tag and one page containing complete English and Simplified Chinese change notes.

### What you can do

| Feature | In practice |
| --- | --- |
| Continue the same task | Keep the original request, conversation, progress notes and recorded tool results together when handing work to another account. |
| Choose an execution account | Select a configured Codex, Claude or Grok CLI profile. Each uses its own login directory. Remove unused accounts from the account panel; task history and local login folders are kept. |
| Change model and reasoning | Adjust either setting during a task. Changes apply to the next execution and are saved per account within that task. |
| Check allowance | View available provider-reported percentages, allowance windows and reset times. Codex reset credits include their individual expiry dates when returned. |
| Hand off after exhaustion | Enable automatic handoff, or select the next account yourself. Prism waits for the previous execution to finish before continuing. |
| Use local skills and tools | Point Prism to assistant instructions, a skills folder and installed applications. Check discovered entry points and supported application operations. |
| Keep your work locally | Choose a permanent task-storage folder, add progress notes and export a Markdown conversation record. |
| Work in your language | Choose one of nine interface languages, including right-to-left Arabic, and switch between light and dark desert themes. |

### Install

These commands install stable version **v0.1.6**. Check the [latest Release](https://github.com/shixi-11/prism-desk/releases/latest) for its version and bilingual change notes.

You will need Windows, Git, Node.js 22.12 or later, npm, and the official CLIs for your chosen providers. Sign in to each CLI separately.

```powershell
git clone --branch v0.1.6 https://github.com/shixi-11/prism-desk.git
cd prism-desk
npm install
npm run build
npm run build:desktop
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-host.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start.ps1
```

The build script compiles the Windows process host used to stop CLI subprocesses together. It uses the .NET Framework compiler included with Windows.

### Before your first task

Install the official CLI for each provider you want to use, then sign in through that CLI. Signing in to a website or desktop app alone does not configure Prism.

- **Codex:** follow the [CLI installation guide](https://developers.openai.com/codex/cli/) and sign in with your ChatGPT account.
- **Claude:** install [Claude Code](https://code.claude.com/docs/en/setup), then [sign in](https://code.claude.com/docs/en/authentication) with a supported Claude subscription. Prism checks subscription login and extra-usage settings before execution; extra usage must be disabled.
- **Grok:** install and sign in to the official Grok CLI with your subscription account.

Open **Accounts → Connect account**, choose Codex, Claude or Grok, and name the account. **Save and continue → Get sign-in link → Copy sign-in link** starts the official CLI authorization flow. Paste the link into your browser’s address bar. If Claude displays an authorization code, paste the complete code into **Authorization code** and choose **Submit code**. The code is sent only to the waiting official CLI, then cleared from the input. After you authorize, Prism verifies the subscription login and makes the account available without restarting. The page also supports checking an existing login, cancelling authorization or copying the link again, renaming profiles, and disabling or enabling accounts. Disabling preserves past tasks and credentials. Advanced settings let you select the official CLI executable or import an existing independent login directory; established account directories and platform identities cannot be changed. Missing CLIs link to official installation instructions. Future platforms require their own provider and execution adapters.

### A typical task

1. Click **New task** and give it a name. The project folder is optional; leaving it blank creates a separate, persistent task workspace.
2. Select an execution account, model and reasoning effort. Use **Read only** for review, or **Edit project** for editing.
3. Enter your request and send it with **Ctrl + Enter**. Follow the conversation and execution log as work progresses.
4. Add important decisions or remaining work to the progress notes. To change accounts, select the next account and use the handoff control; stop the current execution first when required.
5. Rename a task with its pencil button, a double-click or **F2**. Press **Enter** to save or **Esc** to cancel.
6. Continue in the same task. Export its record when you need a Markdown copy, or open the task-storage folder to find the local files.

The next account receives saved conversation, progress notes and tool records. A provider's internal model state is not transferred.

### Messages, settings and previews

#### Goals and plans

The compact **goal bar** above the composer shows the saved goal, execution state and accumulated execution time. Edit, pause, resume or delete the goal from the bar; expand it to see the full goal, editable plan and execution details. Pausing stops the current execution and holds queued messages. Deleting waits for execution to stop, removes the goal and holds pending messages for review; conversation records and workspace files remain available. The timer excludes pauses, idle time and time when the app is closed. Official quota exhaustion is shown separately from network or login failures.

Codex can save goals through Prism’s native tools when you ask it to set or change one. Other entries can propose a goal for you to adopt in the interface. Chat text claiming a goal is saved never changes the actual goal by itself. **Plan first** runs with read-only permissions and returns a draft for review. The composer explicitly indicates when messages only discuss a pending plan; **Confirm plan and execute** starts implementation with the task’s configured permissions. Goals and plans persist across sessions and remain in the handoff record.

#### Models and handoff

Model changes can be applied within the same account using **Switch and continue**. A confirmed execution records its account, model and reasoning level; a saved selection alone is not shown as a completed switch. **Automatic handoff preferences** opens an account list you can drag to reorder, with settings for each account’s model and reasoning level. Changes save automatically for the current task. The list marks accounts that cannot meet the task’s write-access requirements; handoff also respects image support.

#### Accounts and windows

Each account card has an editable **Nickname** with a pencil button. This changes its display name, not its login identity. Native Codex questions and supported question-and-list messages offer clickable choices and a custom answer. Closing the Windows title-bar **×** hides Prism in the notification area; use the tray menu’s **Quit Prism** to stop active work and exit.

#### Task organization

Right-click a task to rename, pin, mark unread, archive, group by project or section, share, copy, fork, open its folder or conversation, open another window, or delete it. **Archived and deleted** in the sidebar restores hidden tasks. Deleting a task preserves its workspace and conversation files. Project selection changes where future work runs; existing files stay in their original folder. Forking starts fresh CLI sessions and copies conversation attachments; the separate-workspace option starts with an empty folder. Share previews a local Markdown document for copying or saving; it does not create a hosted public link. Task changes are synchronized across open windows.

#### Views and allowance

The top bar has view settings and toggles for the bottom execution log and account sidebar. Their state is saved locally. In Accounts, **Check all accounts** queries every configured profile and displays available allowance, reset times, Codex reset credits and credit expiry dates. A failed query does not stop the remaining accounts.

#### Images

Paste screenshots, drop images into the composer or use the image button (up to five images, 10 MB each). Codex receives local images; Claude receives native image content when its subscription checks pass. Claude image execution has not yet been verified against a signed-in account. Grok uses direct image content when the CLI advertises it, otherwise its native Read tool opens the attached images; this path has been verified with a signed-in subscription.

#### Messages and drafts

Send more messages while work runs: they wait in order and can be cancelled. Settings lets you choose Enter or Ctrl/⌘+Enter and queueing or live guidance. Live guidance uses Codex's active turn; other providers fall back to the queue. Failed or interrupted sends hold subsequent messages for review. Drafts are retained while switching tasks in the open app.

#### File previews

Open the preview panel or click a file link to view images, PDFs, Markdown, code and text. Text files can be edited and saved; external changes are checked before saving. HTML previews display standalone pages; interactive projects can use their running HTTP address. Some websites block embedding. The activity panel shows CLI-provided reasoning summaries, plans and execution status when available.

### Automatic updates

1. **Check for updates** reports “New version available” or “You are up to date”. It does not download or restart.
2. **Download and prepare** reports “Update is ready” when preparation finishes. You can continue using the current version.
3. **Update and restart** restarts only after you click it. Once the new version successfully starts, “Updated to vX.X.X” appears once. Ordinary launches and rollbacks do not show this success message.

**Check for updates** in the sidebar follows published stable [GitHub Releases](https://github.com/shixi-11/prism-desk/releases). It shows the installed version, available version, and change notes before downloading. Choose **Later** to keep using your current version. Ordinary main-branch commits do not trigger update notices. Automatic checking is enabled by default: Prism checks after startup and every four hours. A steady blue dot beside Check for updates and an update icon in the top bar indicate an available version. Checking does not download, install, or restart the app. Choose **Download and prepare**, then **Update and restart** when convenient. The dot remains until the installed revision is current. Each window’s drafts are saved before restarting; tasks, queued messages, account operations, editing dialogs and previews block the restart until finished or closed.

Updates keep the same account configuration, task storage and user-data directory. The original checkout and previous installation remain available. A failed download or build leaves the running version intact; if the new app fails to finish startup, opening Prism again restores the previous version. Local source changes block updates, and preparation requires at least 2 GB free. Git must remain installed; the desktop build includes the Node runtime and npm needed for future builds. Installations predating this updater need one manual pull and rebuild using the installation commands below.

### Day and night

Switch between light and dark themes from the top bar.

| Day | Night |
| --- | --- |
| ![Day theme artwork](src/assets/desert-day.jpg) | ![Night theme artwork](src/assets/desert-night.jpg) |

*Theme artwork used by the app.*

### Configure

Most users can connect accounts in **Accounts → Connect account**. The configuration file below is an advanced alternative. Back up an existing file before copying the example.

```powershell
New-Item -ItemType Directory -Force .local
Copy-Item config.example.json .local/config.json
```

Edit `.local/config.json` for your computer. You can also set `PRISM_CONFIG` to an absolute configuration-file path.

A single-account configuration looks like this. Replace the sample login directory with your own, and choose a model available to your account. Adding more entries to `profiles` adds more execution accounts.

```json
{
  "profiles": [
    {
      "id": "codex-personal-1",
      "provider": "Codex",
      "name": "Personal 1",
      "home": "C:/PrismAccounts/codex-personal-1",
      "executable": "codex.exe",
      "model": "gpt-5.6-sol",
      "write": true
    }
  ]
}
```

| Field | Purpose |
| --- | --- |
| `profiles` | Execution accounts: ID, provider, display name, login directory, executable, model and write permission |
| `storageRoot` | Permanent location for task records |
| `assistant.path` | Optional assistant directory containing `SKILL.md` |
| `assistant.instructions` | Optional instructions shared across tasks |
| `skillsPath` | Shared skills directory |
| `apps` | Application names mapped to executable or entry-file paths |

Use absolute paths for local resources and a separate login directory for each account. Keep profile IDs stable: existing tasks use them to identify accounts. The default profile structure is defined in [electron/config.cjs](electron/config.cjs).

Tasks are stored in the application's user-data directory unless `storageRoot` is set. Login credentials stay in the provider's own directory. Local configuration, task records and logs are excluded from Git.

### File and command permissions

Choose **Read only**, **Edit project**, or **Full access** in the composer. Full access is available for Codex, Claude, and Grok: it permits files outside the project and automatically approves tool execution, within operating-system permissions. Changes made during execution are queued for the next run. New installations default to Edit project for supported accounts. Choose **Use as default for new tasks** to save a preference; existing tasks keep their own permissions. Read-only adapters remain read only.

### Accounts and local tools

Codex, Claude, and Grok adapters support file-editing tasks. Grok follows the selected task permissions: read-only disables editing and shell tools; Edit project uses the CLI workspace profile and operation confirmations; Full access permits tool execution. Existing profiles with `write: false` remain read-only until explicitly enabled. Available models depend on the installed CLI and the selected account.

The allowance panel shows information returned by the provider. For valid unified Grok periods, omitted zero usage follows the official client's interpretation; empty, malformed, or expired responses remain unknown. Claude queries retry once after a transient connection failure or missing usage response, but never after an authentication failure. Authentication or network errors do not trigger an account switch as if the allowance were exhausted. Automatic handoff requires a recognized exhaustion response and a completed previous execution.

Account emails are masked by default; use the eye button to reveal or hide them. Query history stays on this device. After restart, records retain their original date and time and are marked for refresh. Historical readings never authorize execution or reset-credit use.

Prism does not fall back to API-key billing or purchase credits. Claude and Grok execution requires confirmation that extra billing is disabled. Using an existing Codex reset credit requires a separate confirmation for the selected account.

Assistant files and skills can be shared across accounts. MCP permissions and application connections must be configured for each execution environment. Application discovery lists installed entry points; the verification action checks supported operations separately.

### Development

```powershell
npm test
npm run build
npm run build:desktop
```

Unit tests use isolated account fixtures. Optional desktop and live CLI checks are described in [scripts/README.md](scripts/README.md); live checks require test accounts and may consume subscription allowance.

For an issue report, include the app and CLI versions, reproduction steps and a redacted error message. Remove credentials, account details and private conversation content before posting.

### Contributor release rules

Before publishing, read [AGENTS.md](AGENTS.md) and [RELEASING.md](RELEASING.md). Every software release needs a new version, one immutable tag, and complete English and Simplified Chinese notes. Run `npm run release:check` and the checks required for the change. Documentation-only edits do not require a new software release.

### License

[MIT](LICENSE). Prism Desk is an independent project. Provider names and trademarks belong to their respective owners.
