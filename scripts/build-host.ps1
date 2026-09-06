$ErrorActionPreference = 'Stop'
$prismRoot = Split-Path -Parent $PSScriptRoot
$prismRuntime = Join-Path $prismRoot 'runtime'
New-Item -ItemType Directory -Path $prismRuntime -Force | Out-Null
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $compiler)) { $compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe' }
if (-not (Test-Path -LiteralPath $compiler)) { throw 'The Windows .NET Framework C# compiler is required to build the process host.' }
& $compiler /nologo /target:exe /optimize+ /reference:System.Runtime.Serialization.dll "/out:$prismRuntime\PrismProcess.exe" "$PSScriptRoot\PrismProcess.cs"
if ($LASTEXITCODE -ne 0) { throw 'Prism process host compilation failed.' }
