$ErrorActionPreference = 'Stop'
$geminiNode = $env:PRISM_NODE
if (-not $geminiNode) {
  $prismNodeCommand = Get-Command node.exe -ErrorAction SilentlyContinue
  if ($prismNodeCommand) { $geminiNode = $prismNodeCommand.Source }
}
# Optional local Codex runtime; no machine-specific user name is stored.
if (-not $geminiNode) { $geminiNode = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' }
if (-not (Test-Path -LiteralPath $geminiNode)) { throw 'Install Node.js 20+ or set PRISM_NODE to its executable.' }
& $geminiNode (Join-Path $PSScriptRoot 'gemini-login.cjs')
exit $LASTEXITCODE
