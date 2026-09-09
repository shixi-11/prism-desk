# Prism Desk · 棱镜

<img src="src/assets/prism-icon.svg" width="80" height="80" alt="Prism Desk">

[English](#english) · [简体中文](#简体中文)

**[Latest version / 最新版本](https://github.com/shixi-11/prism-desk/releases/latest)** · **[Install / 安装指南](#install)** · **[中文安装指南](#安装)**

> Distribution: Windows source installation. No standalone .exe/.msi installer is currently published. GitHub’s “Source code” downloads are source files, not an installable client.
>
> 当前提供 Windows 源码安装，尚未发布可直接安装的 .exe/.msi 客户端。GitHub 的“Source code”下载是源码，首次使用请按下方安装指南构建。

## English

Created by [Shixi Lin](https://shixilin.com/).

Prism Desk is a Windows workspace for subscription CLIs. When one account runs out of allowance, you can move the task to another without rebuilding its conversation and progress notes by hand. The project folder stays the same.

### What you can do

| Feature | In practice |
| --- | --- |
| Continue the same task | Keep the original request, conversation, progress notes and recorded tool results together when handing work to another account. |
| Choose an execution account | Select a configured Codex, Claude or Grok CLI profile. Each uses its own login directory. |
| Change model and reasoning | Adjust either setting during a task. Changes apply to the next execution and are saved per account within that task. |
| Check allowance | View available provider-reported percentages, allowance windows and reset times. Codex reset credits include their individual expiry dates when returned. |
| Hand off after exhaustion | Enable automatic handoff, or select the next account yourself. Prism waits for the previous execution to finish before continuing. |
| Use local skills and tools | Point Prism to assistant instructions, a skills folder and installed applications. Check discovered entry points and supported application operations. |
| Keep your work locally | Choose a permanent task-storage folder, add progress notes and export a Markdown conversation record. |
| Work in your language | Choose one of nine interface languages, including right-to-left Arabic, and switch between light and dark desert themes. |

### Messages, settings and previews

The compact **goal bar** above the composer shows the saved goal, execution state and accumulated execution time. Edit, pause, resume or delete the goal from the bar; expand it to see the full goal, editable plan and execution details. Pausing stops the current execution and holds queued messages. Deleting waits for execution to stop, removes the goal and holds pending messages for review; conversation records and workspace files remain available. The timer excludes pauses, idle time and time when the app is closed. Official quota exhaustion is shown separately from network or login failures.

Codex can save goals through Prism’s native tools when you ask it to set or change one. Other entries can propose a goal for you to adopt in the interface. Chat text claiming a goal is saved never changes the actual goal by itself. **Plan first** runs with read-only permissions and returns a draft for review. The composer explicitly indicates when messages only discuss a pending plan; **Confirm plan and execute** starts implementation with the task’s configured permissions. Goals and plans persist across sessions and remain in the handoff record.

Model changes can be applied within the same account using **Switch and continue**. A confirmed execution records its account, model and reasoning level; a saved selection alone is not shown as a completed switch. **Automatic handoff preferences** opens an account list you can drag to reorder, with settings for each account’s model and reasoning level. Changes save automatically for the current task. The list marks accounts that cannot meet the task’s write-access requirements; handoff also respects image support.

Each account card has an editable **Nickname** with a pencil button. This changes its display name, not its login identity. Native Codex questions and supported question-and-list messages offer clickable choices and a custom answer. Closing the Windows title-bar **×** hides Prism in the notification area; use the tray menu’s **Quit Prism** to stop active work and exit.

Right-click a task to rename, pin, mark unread, archive, group by project or section, share, copy, fork, open its folder or conversation, open another window, or delete it. **Archived and deleted** in the sidebar restores hidden tasks. Deleting a task preserves its workspace and conversation files. Project selection changes where future work runs; existing files stay in their original folder. Forking starts fresh CLI sessions and copies conversation attachments; the separate-workspace option starts with an empty folder. Share previews a local Markdown document for copying or saving; it does not create a hosted public link. Task changes are synchronized across open windows.

The top bar has view settings and toggles for the bottom execution log and account sidebar. Their state is saved locally. In Accounts, **Check all accounts** queries every configured profile and displays available allowance, reset times, Codex reset credits and credit expiry dates. A failed query does not stop the remaining accounts.

Paste screenshots, drop images into the composer or use the image button (up to five images, 10 MB each). Codex receives local images; Claude receives native image content when its subscription checks pass. Claude image execution has not yet been verified against a signed-in account. Grok uses direct image content when the CLI advertises it, otherwise its native Read tool opens the attached images; this path has been verified with a signed-in subscription.

Send more messages while work runs: they wait in order and can be cancelled. Settings lets you choose Enter or Ctrl/⌘+Enter and queueing or live guidance. Live guidance uses Codex's active turn; other providers fall back to the queue. Failed or interrupted sends hold subsequent messages for review. Drafts are retained while switching tasks in the open app.

Open the preview panel or click a file link to view images, PDFs, Markdown, code and text. Text files can be edited and saved; external changes are checked before saving. HTML previews display standalone pages; interactive projects can use their running HTTP address. Some websites block embedding. The activity panel shows CLI-provided reasoning summaries, plans and execution status when available.

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

### Automatic updates

**Check for updates** in the sidebar follows published stable [GitHub Releases](https://github.com/shixi-11/prism-desk/releases). It shows the installed version, available version, and change notes before downloading. Choose **Later** to keep using your current version. Ordinary main-branch commits do not trigger update notices. Automatic checking is enabled by default: Prism checks after startup and every four hours. A steady blue dot beside Check for updates and an update icon in the top bar indicate an available version. Checking does not download, install, or restart the app. Choose **Download and prepare**, then **Update and restart** when convenient. The dot remains until the installed revision is current. Each window’s drafts are saved before restarting; tasks, queued messages, account operations, editing dialogs and previews block the restart until finished or closed.

Updates keep the same account configuration, task storage and user-data directory. The original checkout and previous installation remain available. A failed download or build leaves the running version intact; if the new app fails to finish startup, opening Prism again restores the previous version. Local source changes block updates, and preparation requires at least 2 GB free. Git must remain installed; the desktop build includes the Node runtime and npm needed for future builds. Installations predating this updater need one manual pull and rebuild using the installation commands below.

### Day and night

Switch between light and dark themes from the top bar.

| Day | Night |
| --- | --- |
| ![Day theme artwork](src/assets/desert-day.jpg) | ![Night theme artwork](src/assets/desert-night.jpg) |

*Theme artwork used by the app.*

### Install

These commands install stable version **v0.1.3**. Check the [latest Release](https://github.com/shixi-11/prism-desk/releases/latest) for its version and bilingual change notes.

You will need Windows, Git, Node.js 22.12 or later, npm, and the official CLIs for your chosen providers. Sign in to each CLI separately.

```powershell
git clone --branch v0.1.3 https://github.com/shixi-11/prism-desk.git
cd prism-desk
npm install
npm run build
npm run build:desktop
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-host.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start.ps1
```

The build script compiles the Windows process host used to stop CLI subprocesses together. It uses the .NET Framework compiler included with Windows.

### Configure

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

### License

[MIT](LICENSE). Prism Desk is an independent project. Provider names and trademarks belong to their respective owners.

## 简体中文

由林拾汐创作。[认识作者 → shixilin.com](https://shixilin.com/)

棱镜是一款面向订阅 CLI 的 Windows 桌面工作台。一个账号额度用完，可以把任务交给另一个账号，不必手动重建对话、重新整理进度。切换后仍使用原项目目录。

### 可以做什么

| 功能 | 具体用途 |
| --- | --- |
| 同一任务接续 | 切换账号时保留原始要求、对话、进度备注和已记录的工具结果，供下一次执行读取。 |
| 选择执行账号 | 在已配置的 Codex、Claude、Grok CLI 入口之间选择，各账号使用独立登录目录。 |
| 切换模型与思考等级 | 任务过程中即可调整，从下一次执行生效；设置按任务内的不同账号分别保存。 |
| 查看额度 | 展示提供方可返回的剩余百分比、限制周期和恢复时间；Codex 重置卡按返回结果逐张列出到期日。 |
| 额度耗尽后换号 | 可开启自动接续，也可手动选择下一个账号。前一次执行结束后，才开始下一次执行。 |
| 使用技能与本机工具 | 配置助手指令、技能目录和应用路径，查看已发现的入口，并验证受支持的应用操作。 |
| 在本机保存工作 | 指定固定会话目录、补充进度备注，并将对话导出为 Markdown。 |
| 选择语言与主题 | 支持九种界面语言、阿拉伯语从右到左布局，以及日间和夜间的大漠主题。 |

### 首次使用前

先安装准备使用的官方 CLI，并在 CLI 中完成登录。仅登录网页或桌面客户端，不等于棱镜已经接入账号。

- **Codex：**按[官方安装说明](https://developers.openai.com/codex/cli/)安装 Codex CLI，使用 ChatGPT 账号登录。
- **Claude：**安装 [Claude Code](https://code.claude.com/docs/en/setup)，按[登录说明](https://code.claude.com/docs/en/authentication)使用支持的 Claude 订阅账号登录。执行前会检查订阅登录和额外用量设置，额外付费用量需关闭。
- **Grok：**安装官方 Grok CLI，使用订阅账号登录。

在 `.local/config.json` 中填写程序路径和登录时使用的账号目录。配置修改后重启棱镜，选择账号并刷新状态；未登录或检查失败的账号需先处理对应问题，再执行任务。

### 怎么使用

1. 点击**新建任务**并填写名称。工作目录可留空，棱镜会创建独立、持久的任务工作区；也可以选择已有的项目文件夹。
2. 选择**执行账号、模型和思考等级**。查看或分析资料时使用只读模式，需要改文件时选择**项目内编辑**。
3. 输入要求，点击发送或按 **Ctrl + Enter**。在对话和执行记录中查看进展。
4. 把重要决定和待办写入**进度备注**。需要换号时，选择下一个账号并使用接续按钮；当前仍在执行时，先按提示停止。
5. 点击任务旁的铅笔、双击任务名或按 **F2** 即可重命名，按 **Enter** 保存，按 **Esc** 取消。
6. 在原任务中继续。需要留档时使用**导出记录**生成 Markdown，也可打开会话保存位置查看本机文件。

换号时，新账号读取已保存的对话、进度备注和工具记录。提供方内部的模型状态不随任务转移。

### 白天与黑夜

点击顶部的太阳或月亮按钮切换日间、夜间主题。

| 日间 | 夜间 |
| --- | --- |
| ![棱镜日间主题背景](src/assets/desert-day.jpg) | ![棱镜夜间主题背景](src/assets/desert-night.jpg) |

*以上为应用使用的主题背景。*

### 安装

以下命令安装稳定版 **v0.1.3**。[最新发布页](https://github.com/shixi-11/prism-desk/releases/latest)提供版本号与中英文更新内容。

需要 Windows、Git、Node.js 22.12 或更新版本、npm，以及准备使用的官方 CLI。各 CLI 需分别完成登录。

```powershell
git clone --branch v0.1.3 https://github.com/shixi-11/prism-desk.git
cd prism-desk
npm install
npm run build
npm run build:desktop
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-host.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start.ps1
```

构建脚本使用 Windows 自带的 .NET Framework 编译器生成进程宿主，用于一起停止 CLI 及其子进程。

### 自动更新

侧栏的**检查更新**只跟随正式稳定的 [GitHub Releases](https://github.com/shixi-11/prism-desk/releases)，先显示当前版本、新版本和更新内容；点击**稍后**可继续使用当前版本。普通代码提交不会反复提醒升级。默认在启动后及每四小时自动检查一次。侧栏提供常驻的**检查更新**入口，点击即可检查并打开结果面板。有新版时，该入口旁显示常亮蓝点，右上角也会出现更新入口，检查不会自行下载、安装或重启。方便时点击**下载并准备 → 更新并重启**，更新到当前版本后蓝点消失。重启前保存各窗口的草稿；任务、待发送消息、账号操作、编辑对话框和预览面板尚未处理完时，会阻止重启。

更新沿用账号配置、会话存储和用户数据目录，保留原始源码目录及上一版安装。下载或构建失败时继续使用当前版本；新版未完成启动时，再次打开棱镜会恢复上一版。有本地源码修改时暂停更新，准备新版至少需要 2 GB 可用空间。Git 需保持可用；桌面构建已包含后续构建所需的 Node 运行时和 npm。尚未包含更新功能的旧安装，需要先手动拉取一次代码并按上述命令重新构建。

### 配置

```powershell
New-Item -ItemType Directory -Force .local
Copy-Item config.example.json .local/config.json
```

按自己的电脑环境编辑 `.local/config.json`，也可通过环境变量 `PRISM_CONFIG` 指定配置文件的绝对路径。

下面是一个账号的配置示例。将示例登录目录换成自己的目录，并填写账号可用的模型；在 `profiles` 数组中继续添加条目，即可增加执行账号。

```json
{
  "profiles": [
    {
      "id": "codex-personal-1",
      "provider": "Codex",
      "name": "个人-1",
      "home": "C:/PrismAccounts/codex-personal-1",
      "executable": "codex.exe",
      "model": "gpt-5.6-sol",
      "write": true
    }
  ]
}
```

| 字段 | 用途 |
| --- | --- |
| `profiles` | 执行账号的 ID、提供方、显示名称、登录目录、程序路径、模型和写入权限 |
| `storageRoot` | 会话记录的固定保存位置 |
| `assistant.path` | 可选的助手目录，目录内包含 `SKILL.md` |
| `assistant.instructions` | 可选的跨任务助手指令 |
| `skillsPath` | 共享技能目录 |
| `apps` | 应用名称及对应程序或入口文件的路径 |

本机资源使用绝对路径，每个账号使用独立的登录目录。已有任务通过账号 ID 识别执行入口，配置后应保持 ID 稳定。默认账号结构见 [electron/config.cjs](electron/config.cjs)。

未设置 `storageRoot` 时，会话保存在应用用户数据目录。登录凭据留在各提供方自己的目录中，本地配置、任务记录和日志不进入 Git。

### 文件与命令权限

在输入框下方选择**只读**、**项目内编辑**或**完全访问**。Codex、Claude 和 Grok 支持完全访问，可在操作系统权限范围内访问项目外文件，并自动允许工具执行。执行中修改权限会排到下一轮生效。首次使用时，支持编辑的账号默认采用项目内编辑。点击**设为新任务默认权限**可保存偏好，已有任务仍保留各自权限；只读入口继续使用只读。

### 账号与本机工具

Codex、Claude 和 Grok 适配器支持文件修改任务。Grok 按任务权限运行：只读禁用编辑和命令执行，项目内编辑使用 CLI 的 workspace 配置与操作确认，完全访问允许工具执行。已有账号配置中的 `write: false` 保持只读，需明确改为 `true` 才启用写入。可用模型由已安装的 CLI 和所选账号决定。

额度栏展示提供方返回的信息。Grok 的有效统一额度周期按官方客户端口径解析省略的零使用量；空响应、异常数值和过期周期仍保留为未知。Claude 查询遇到短暂连接故障或未返回额度时会重试一次，认证失败不重试。认证失败和网络错误不会被当作额度耗尽来切换账号。自动接续需要收到可识别的额度耗尽响应，并等待前一次执行结束。

账号页的邮箱默认遮罩显示，点击眼睛图标可展开或隐藏。查询记录仅保存在本机；重启后显示原查询日期和时间，并标明需要刷新。历史记录不用于执行授权或重置卡操作。

棱镜不回退到 API Key 计费，也不购买额度。Claude 和 Grok 执行前需确认额外计费已关闭；使用已有的 Codex 重置卡，需要针对所选账号单独确认。

助手文件和技能可跨账号共享。MCP 权限与应用连接需在各执行环境分别配置。本机应用列表展示已发现的安装入口，验证功能另行检查其支持的具体操作。

### 开发

```powershell
npm test
npm run build
npm run build:desktop
```

单元测试使用隔离的模拟账号配置。桌面检查与真实 CLI 检查见 [scripts/README.md](scripts/README.md)；真实调用需要配置测试账号，并可能消耗订阅额度。

提交问题时，请附上应用与 CLI 版本、复现步骤和脱敏后的错误信息。发布前移除凭据、账号信息与私人对话内容。

### 许可证

采用 [MIT 许可证](LICENSE)。棱镜是独立项目，各提供方名称与商标归其所有者所有。

### 消息、设置与预览

输入框上方的紧凑目标条显示目标、执行状态和累计执行用时，可直接修改、暂停、继续或删除目标；展开后查看完整目标、计划和执行详情。暂停会停止当前执行并拦住排队消息；删除会等待执行停止，再移除目标并将排队消息留待核对，保留聊天和工作区文件。计时不包含暂停、空闲和应用关闭的时间。官方返回额度耗尽时显示「额度已用完」，自动换账号期间显示「额度已用完，正在接续」；网络或登录失败显示对应原因。

在 Codex 中要求设置或修改目标时，模型可通过棱镜的真实工具保存；其他入口可提出目标建议，由用户在界面采用。聊天里自称「已设置」不会改动真实目标。「先制订计划」以只读权限生成待核对步骤，输入框会明确提示当前消息仅讨论计划；点击「确认计划并执行」后才按已设置权限开始实施。目标和计划持久保存，并进入本地交接记录。

同账号更换模型或思考等级后，可点击「切换并继续」。实际执行开始后会显示生效配置，并在切换时留下提示。「自动接续偏好」在独立窗口中拖动账号排序，点击每行设置按钮修改模型和思考等级，改动自动保存并用于当前任务。列表标明无法满足当前写入权限的账号，实际接续也会核对图片支持情况。

账号卡片显示「备注名」和铅笔按钮，回车保存、Esc 取消；修改备注名不改变登录身份。原生 Codex 提问及符合格式的文字选项提供可点击按钮和自行填写入口。窗口右上角 × 将棱镜收进通知区，后台任务继续运行；右键托盘图标选择「退出棱镜」，才会停止执行并退出。

右键任务可重命名、置顶、标记未读、归档、按项目或分区整理、分享、复制、分叉、打开工作目录或对话文档、在新窗口中打开，以及删除任务。侧栏“归档与已删除”可恢复任务；删除保留工作目录和对话文件。选择项目会改变后续执行的工作目录，已有文件留在原处。分叉复制对话和附件，并建立新的 CLI 会话；独立工作区选项使用新的空白文件夹。“分享”先预览本地 Markdown 文档，支持复制或保存，不生成托管的公开链接。多个窗口会同步任务变更。

顶部提供视图设置、底部执行记录和右侧账号栏开关，并记住开关状态。账号页的**一键查询全部**会查询所有已配置账号，展示剩余额度、恢复时间、Codex 重置卡数量与到期时间。单个账号查询失败不影响其他账号。

支持粘贴截图、拖入图片或点击图片按钮，每条最多 5 张、每张不超过 10 MB。Codex 使用原生图片输入；Claude 在订阅检查通过后使用原生图片消息，目前尚未完成已登录账号的图片实测。Grok 在 CLI 声明支持时使用直接图片输入，否则由原生 Read 工具查看附件；已用真实订阅账号验证读图。

执行中可继续发送，消息依次排队，也可取消。设置中可选择 Enter 或 Ctrl/⌘+Enter 发送，以及排队或实时引导；实时引导使用 Codex 当前轮次，其他入口转为排队。失败或中断后，后续消息暂停等待核对。应用打开期间，切换任务会保留各自的输入草稿。

点击预览按钮或对话中的文件链接，可查看图片、PDF、Markdown、代码和文本；文本支持编辑保存，并检查文件是否已被外部修改。HTML 可直接预览独立页面，交互项目可填写已启动的 HTTP 地址。部分网站禁止嵌入。思考与执行面板显示 CLI 实际返回的思考摘要、计划和执行状态。
在**账号 → 接入账号**中选择 Codex、Claude 或 Grok，填写名称，再点**保存并继续 → 获取登录链接 → 复制登录链接**。将链接粘贴到浏览器地址栏；若 Claude 显示授权码，回到棱镜的**授权码**输入框粘贴完整内容，再点**提交授权码**。授权码仅交给正在等待的官方 CLI，提交后清空输入框。授权完成后，棱镜会自动检查订阅登录，账号无需重启即可进入执行列表。也可检查已有登录、取消登录或重新复制链接、改名，以及停用或启用账号；停用保留历史任务与本机凭据。高级设置支持选择官方 CLI 程序，或使用已有的独立账号目录；已有账号的平台和登录目录保持固定。本机缺少 CLI 时会提供官方安装说明，后续平台通过独立适配器接入。

## Contributor release rules / 贡献者发布规则

Agents and contributors: read [AGENTS.md](AGENTS.md) and [RELEASING.md](RELEASING.md) before publishing. Run `npm run release:check` to validate the version and release notes.

后续 agent 与贡献者发布前请读取 [AGENTS.md](AGENTS.md) 和 [RELEASING.md](RELEASING.md)，运行 `npm run release:check` 核对版本号和更新说明。
