$ErrorActionPreference = 'Stop'
$prismRoot = Split-Path -Parent $PSScriptRoot
$prismExe = Join-Path $prismRoot 'node_modules\electron\dist\electron.exe'
if (-not (Test-Path -LiteralPath $prismExe)) { throw 'Electron runtime is missing. See README.md.' }
if (-not (Test-Path -LiteralPath (Join-Path $prismRoot 'runtime\PrismProcess.exe'))) { & (Join-Path $PSScriptRoot 'build-host.ps1') }
Start-Process -FilePath $prismExe -ArgumentList @(('"' + $prismRoot + '"')) -WorkingDirectory $prismRoot -WindowStyle Hidden
