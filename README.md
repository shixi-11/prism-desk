# Prism Desk · 棱镜

<img src="src/assets/prism-icon.svg" width="80" height="80" alt="Prism Desk">

[English](#english) · [简体中文](#简体中文)

## English

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

### Before your first task

Install the official CLI for each provider you want to use, then sign in through that CLI. Signing in to a website or desktop app alone does not configure Prism.

- **Codex:** follow the [CLI installation guide](https://developers.openai.com/codex/cli/) and sign in with your ChatGPT account.
- **Claude:** install [Claude Code](https://code.claude.com/docs/en/setup), then [sign in](https://code.claude.com/docs/en/authentication) with a supported Claude subscription. Prism checks subscription login and extra-usage settings before execution; extra usage must be disabled.
- **Grok:** install and sign in to the official Grok CLI with your subscription account.

Add each account to `.local/config.json` with its executable and the login directory used during sign-in. Restart Prism after changing this configuration, select the account and refresh its status. Missing login or a failed check must be resolved before that account can run a task.

### A typical task

1. Click **New task**, give it a name and choose the project folder.
2. Select an execution account, model and reasoning effort. Use **Read only** for review, or **Edit project** for editing.
3. Enter your request and send it with **Ctrl + Enter**. Follow the conversation and execution log as work progresses.
4. Add important decisions or remaining work to the progress notes. To change accounts, select the next account and use the handoff control; stop the current execution first when required.
5. Rename a task with its pencil button, a double-click or **F2**. Press **Enter** to save or **Esc** to cancel.
6. Continue in the same task. Export its record when you need a Markdown copy, or open the task-storage folder to find the local files.

The next account receives saved conversation, progress notes and tool records. A provider's internal model state is not transferred.

### Day and night

Switch between light and dark themes from the top bar.

| Day | Night |
| --- | --- |
| ![Day theme artwork](src/assets/desert-day.jpg) | ![Night theme artwork](src/assets/desert-night.jpg) |

*Theme artwork used by the app.*

### Install

You will need Windows, Node.js 22.12 or later, npm, and the official CLIs for your chosen providers. Sign in to each CLI separately.

```powershell
git clone https://github.com/shixi-11/prism-desk.git
cd prism-desk
npm install
npm run build
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-host.ps1
npm start
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

Choose **Read only**, **Edit project**, or **Full access** in the composer. Full access is available for Codex and Claude: it permits files outside the project and automatically approves tool execution, within operating-system permissions. Changes made during execution are queued for the next run. New installations default to Edit project for supported accounts. Choose **Use as default for new tasks** to save a preference; existing tasks keep their own permissions. Read-only adapters remain read only.

### Accounts and local tools

Codex and Claude adapters support file-editing tasks. Grok supports read-only research. Available models depend on the installed CLI and the selected account.

The allowance panel shows information returned by the provider. Missing values remain unknown. Authentication or network errors do not trigger an account switch as if the allowance were exhausted. Automatic handoff requires a recognized exhaustion response and a completed previous execution.

Prism does not fall back to API-key billing or purchase credits. Claude and Grok execution requires confirmation that extra billing is disabled. Using an existing Codex reset credit requires a separate confirmation for the selected account.

Assistant files and skills can be shared across accounts. MCP permissions and application connections must be configured for each execution environment. Application discovery lists installed entry points; the verification action checks supported operations separately.

### Development

```powershell
npm test
npm run build
```

Unit tests use isolated account fixtures. Optional desktop and live CLI checks are described in [scripts/README.md](scripts/README.md); live checks require test accounts and may consume subscription allowance.

For an issue report, include the app and CLI versions, reproduction steps and a redacted error message. Remove credentials, account details and private conversation content before posting.

### License

[MIT](LICENSE). Prism Desk is an independent project. Provider names and trademarks belong to their respective owners.

## 简体中文

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

1. 点击**新建任务**，填写名称，选择实际要工作的项目文件夹。
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

需要 Windows、Node.js 22.12 或更新版本、npm，以及准备使用的官方 CLI。各 CLI 需分别完成登录。

```powershell
git clone https://github.com/shixi-11/prism-desk.git
cd prism-desk
npm install
npm run build
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-host.ps1
npm start
```

构建脚本使用 Windows 自带的 .NET Framework 编译器生成进程宿主，用于一起停止 CLI 及其子进程。

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

在输入框下方选择**只读**、**项目内编辑**或**完全访问**。Codex 和 Claude 支持完全访问，可在操作系统权限范围内访问项目外文件，并自动允许工具执行。执行中修改权限会排到下一轮生效。首次使用时，支持编辑的账号默认采用项目内编辑。点击**设为新任务默认权限**可保存偏好，已有任务仍保留各自权限；只读入口继续使用只读。

### 账号与本机工具

Codex 和 Claude 适配器支持文件修改任务；Grok 支持只读研究。可用模型由已安装的 CLI 和所选账号决定。

额度栏展示提供方返回的信息，缺失的数值保留为未知。认证失败和网络错误不会被当作额度耗尽来切换账号。自动接续需要收到可识别的额度耗尽响应，并等待前一次执行结束。

棱镜不回退到 API Key 计费，也不购买额度。Claude 和 Grok 执行前需确认额外计费已关闭；使用已有的 Codex 重置卡，需要针对所选账号单独确认。

助手文件和技能可跨账号共享。MCP 权限与应用连接需在各执行环境分别配置。本机应用列表展示已发现的安装入口，验证功能另行检查其支持的具体操作。

### 开发

```powershell
npm test
npm run build
```

单元测试使用隔离的模拟账号配置。桌面检查与真实 CLI 检查见 [scripts/README.md](scripts/README.md)；真实调用需要配置测试账号，并可能消耗订阅额度。

提交问题时，请附上应用与 CLI 版本、复现步骤和脱敏后的错误信息。发布前移除凭据、账号信息与私人对话内容。

### 许可证

采用 [MIT 许可证](LICENSE)。棱镜是独立项目，各提供方名称与商标归其所有者所有。
