$startupPath = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup\WiFiAdminDashboard.lnk')
$vbsPath = 'C:\Users\XUAN TIEN\.gemini\antigravity\scratch\wifi_admin_dashboard\start_silent.vbs'

$ws = New-Object -ComObject WScript.Shell
$sc = $ws.CreateShortcut($startupPath)
$sc.TargetPath = 'wscript.exe'
$sc.Arguments = "`"$vbsPath`""
$sc.Save()

Write-Host "Shortcut created successfully at: $startupPath"
