$ErrorActionPreference = 'Stop'
$prismRoot = Split-Path -Parent $PSScriptRoot
$prismExe = Join-Path $prismRoot 'runtime\desktop\Prism.exe'
if (-not (Test-Path -LiteralPath $prismExe)) { throw 'Electron runtime is missing. See README.md.' }
if (-not (Test-Path -LiteralPath (Join-Path $prismRoot 'runtime\PrismProcess.exe'))) { & (Join-Path $PSScriptRoot 'build-host.ps1') }
$prismUserData = Join-Path $prismRoot '.local\desktop-runtime'
$prismLauncher = Join-Path $prismRoot 'runtime\PrismLauncher.exe'
if (-not (Test-Path -LiteralPath $prismLauncher)) { & (Join-Path $PSScriptRoot 'build-launcher.ps1') }
Start-Process -FilePath $prismLauncher -ArgumentList ('--user-data-dir="' + $prismUserData + '"') -WorkingDirectory $prismRoot -WindowStyle Hidden
