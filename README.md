# Prism Desk · 棱镜

A Windows desktop workspace for continuing a task across subscription CLI accounts. Keep the conversation, working folder and handoff notes together while choosing an execution account, model and reasoning effort.

## Status

Early source release for Windows. Provider CLIs must be installed and signed in separately. This app does not include accounts, credentials, private skills or conversation history.

- Persistent tasks and explicit account handoff after the previous execution stops.
- Model and reasoning selection during a task; changes apply to the next execution.
- Official allowance information where available. Missing values stay unknown; authentication and network failures are not treated as exhaustion.
- Nine interface languages: Simplified Chinese, Traditional Chinese, English, Japanese, Korean, Spanish, French, German and Arabic, with right-to-left layout.
- Light and dark desert themes.
- Optional local assistant instructions, skills and application discovery.

Codex and Claude support project-writing workflows. Grok and Gemini adapters currently restrict execution to read-only workflows. Gemini authentication and model execution are experimental. Finding an installed application does not establish that automation is connected. The local validation action tests only its explicitly supported applications.

## Run from source

Requirements: Windows, Node.js 22 or later, npm, and the provider CLIs you plan to use.

```sh
npm install
npm run build
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-host.ps1
npm start
```

The process host is built locally from `scripts/PrismProcess.cs` using the Windows .NET Framework compiler. It controls subprocess lifetime and cancellation.

Copy `config.example.json` to `.local/config.json` and set your own absolute CLI login directories and executable paths. The `PRISM_CONFIG` environment variable can select another local configuration file. Keep it outside version control. Each profile must use its own provider-supported login environment; configuration never contains tokens or passwords. Sign in with the corresponding official CLI before running a task.

Optional fields include `assistant.path`, `assistant.instructions`, `skillsPath`, `geminiEntry`, `storageRoot` and `apps`. Shared files do not grant MCP or application permissions: configure those separately for each execution environment.

Task storage defaults to the application's user-data directory. Set `storageRoot` to a dedicated folder to choose a permanent location. Interface language is saved automatically. User messages and execution output retain their original language.

## Billing behavior

The app does not provide an API-key billing fallback or purchase credits. Claude and Grok execution is blocked when extra-billing status is enabled or cannot be verified. Provider behavior may change; unsupported or unavailable quota fields remain unknown. Using an existing Codex reset credit is a separate, explicitly confirmed action for the selected account.

## Development

```sh
npm test
npm run build
```

Live integration scripts may require explicitly configured test accounts and can consume subscription allowance. Unit tests use isolated fixtures. Local logs, screenshots, account configuration and task data are excluded from the repository.

## 简体中文

棱镜是一款 Windows 桌面工作台，让同一个任务在不同订阅 CLI 账号之间接续，保留对话、项目目录与交接记录。可在任务过程中调整模型与思考等级，设置从下一次执行生效。

界面支持简体中文、繁体中文、英语、日语、韩语、西班牙语、法语、德语和阿拉伯语，包含阿拉伯语从右到左布局以及日夜主题。切换界面语言不会翻译或改写任务原文。

这是早期源码版。请分别安装并登录官方 CLI，按照上方步骤安装依赖、构建前端及进程宿主，再启动应用。把 `config.example.json` 复制为 `.local/config.json`，填写自己的隔离登录目录、程序路径和可选能力路径。配置文件不保存令牌或密码，也不上传仓库。

会话默认保存在应用用户数据目录，可通过 `storageRoot` 指定固定位置。账号、会话、私密助手资料、技能内容和本机验证报告均不包含在开源仓库中。发现本机程序只代表安装入口存在；调用权限与自动化接口需分别接通并验证。

额度仅展示可获得的官方信息。未知额度、认证失败与网络错误不会被当作额度耗尽；不回退到 API 计费，不购买额度。使用已有 Codex 重置卡需要单独确认。Gemini 登录与执行仍处于实验阶段。

## License

MIT. Provider products and trademarks belong to their respective owners. Prism Desk is an independent project.
