$ErrorActionPreference = 'Stop'
$prismRoot = Split-Path -Parent $PSScriptRoot
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $compiler)) { $compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe' }
$output = Join-Path $prismRoot 'runtime\PrismLauncher.exe'
New-Item -ItemType Directory -Path (Split-Path -Parent $output) -Force | Out-Null
& $compiler /nologo /target:winexe /optimize+ "/win32icon:$prismRoot\src\assets\prism.ico" "/out:$output" "$PSScriptRoot\PrismLauncher.cs"
if ($LASTEXITCODE -ne 0) { throw 'Prism launcher compilation failed.' }
