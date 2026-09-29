param([Parameter(Mandatory=$true)][string]$DocumentPath)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Windows.Forms
$clipboardItem = New-Object System.Windows.Forms.DataObject
$clipboardFiles = New-Object System.Collections.Specialized.StringCollection
[void]$clipboardFiles.Add($DocumentPath)
$clipboardItem.SetFileDropList($clipboardFiles)
$clipboardItem.SetText([System.IO.File]::ReadAllText($DocumentPath, [System.Text.Encoding]::UTF8), [System.Windows.Forms.TextDataFormat]::UnicodeText)
[System.Windows.Forms.Clipboard]::SetDataObject($clipboardItem, $true, 5, 100)
