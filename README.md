# Prism Desk · 棱镜

[English](#english) · [简体中文](#简体中文)

## English

Switch accounts. Keep working on the same task.

Prism Desk brings subscription CLIs into one Windows desktop workspace. A task keeps its conversation, project folder and handoff notes as you move between execution accounts. Model and reasoning settings stay with the task.

### Working in Prism

Create a task, choose its project folder and select an account. Start in read-only mode, or allow changes when the task requires editing files.

When switching accounts, Prism waits for the current execution to stop, then passes the task's instructions, progress notes and recorded results to the next account. You can change the model and reasoning effort during a task; the new settings take effect on the next execution.

The interface has two desert themes: warm sand by day, dark earth by night. It supports Simplified Chinese, Traditional Chinese, English, Japanese, Korean, Spanish, French, German and Arabic. Language selection is saved, and Arabic uses a right-to-left layout. Conversation text stays in its original language.

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

| Field | Purpose |
| --- | --- |
| `profiles` | Execution accounts: ID, provider, display name, login directory, executable, model and write permission |
| `storageRoot` | Permanent location for task records |
| `assistant.path` | Optional assistant directory containing `SKILL.md` |
| `assistant.instructions` | Optional instructions shared across tasks |
| `skillsPath` | Shared skills directory |
| `apps` | Application names mapped to executable or entry-file paths |
| `geminiEntry` | Path to the installed Gemini CLI JavaScript entry |

Use absolute paths for local resources and a separate login directory for each account. Keep profile IDs stable: existing tasks use them to identify accounts. The default profile structure is defined in [electron/config.cjs](electron/config.cjs).

Tasks are stored in the application's user-data directory unless `storageRoot` is set. Login credentials stay in the provider's own directory. Local configuration, task records and logs are excluded from Git.

### Accounts and local tools

Codex and Claude adapters support file-editing tasks. Grok and Gemini adapters use read-only execution. Available models depend on the installed CLI and the selected account.

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

换一个执行账号，接着完成同一个任务。

棱镜把订阅 CLI 放进同一个 Windows 桌面工作台。切换账号时，对话、项目目录和交接记录仍留在原来的任务里，模型与思考等级也随任务保存。

### 在棱镜中工作

新建任务，选择项目目录和执行账号。默认以只读模式开始，需要修改文件时再开启项目写入权限。

切换账号时，棱镜会等待当前执行停止，再把任务要求、进度备注和已记录的执行结果交给下一个账号。任务过程中可以调整模型与思考等级，新设置从下一次执行生效。

界面沿用大漠的色调：白天是温暖的沙色，夜晚是沉静的深褐。支持简体中文、繁体中文、英语、日语、韩语、西班牙语、法语、德语和阿拉伯语，自动保存语言选择，并为阿拉伯语提供从右到左的布局。对话内容保留原文。

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

| 字段 | 用途 |
| --- | --- |
| `profiles` | 执行账号的 ID、提供方、显示名称、登录目录、程序路径、模型和写入权限 |
| `storageRoot` | 会话记录的固定保存位置 |
| `assistant.path` | 可选的助手目录，目录内包含 `SKILL.md` |
| `assistant.instructions` | 可选的跨任务助手指令 |
| `skillsPath` | 共享技能目录 |
| `apps` | 应用名称及对应程序或入口文件的路径 |
| `geminiEntry` | 已安装 Gemini CLI 的 JavaScript 入口路径 |

本机资源使用绝对路径，每个账号使用独立的登录目录。已有任务通过账号 ID 识别执行入口，配置后应保持 ID 稳定。默认账号结构见 [electron/config.cjs](electron/config.cjs)。

未设置 `storageRoot` 时，会话保存在应用用户数据目录。登录凭据留在各提供方自己的目录中，本地配置、任务记录和日志不进入 Git。

### 账号与本机工具

Codex 和 Claude 适配器支持文件修改任务；Grok 和 Gemini 适配器采用只读执行。可用模型由已安装的 CLI 和所选账号决定。

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
