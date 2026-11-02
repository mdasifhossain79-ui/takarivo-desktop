$ws = New-Object -ComObject WScript.Shell
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop 'Takarivo.lnk'
$shortcut = $ws.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $PSScriptRoot 'Takarivo-App.bat'
$shortcut.WorkingDirectory = $PSScriptRoot
$shortcut.Description = 'Takarivo Personal Banking'

$iconPath = Join-Path $PSScriptRoot 'assets\app-icon.ico'
if (Test-Path $iconPath) {
    $shortcut.IconLocation = "$iconPath,0"
}

$shortcut.Save()
Write-Output "Shortcut created successfully at $shortcutPath with custom Takarivo icon."
