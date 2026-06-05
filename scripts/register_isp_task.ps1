# register_isp_task.ps1
# Registra una tarea diaria en Windows Task Scheduler para ejecutar el scraper ISP.
# Ejecutar UNA vez como Administrador:
#   powershell -ExecutionPolicy Bypass -File scripts\register_isp_task.ps1

$TaskName    = "XiaomiISPDailyScrape"
$ScriptPath  = "$PSScriptRoot\scrape_isp_portal.py"
$PythonExe   = "C:\Users\Usuario01\Dashboard-BI\.venv-1\Scripts\python.exe"
$WorkingDir  = "C:\Users\Usuario01\Dashboard-BI"

# Ejecutar a las 07:00 todos los dias
$Trigger  = New-ScheduledTaskTrigger -Daily -At "07:00"
$Action   = New-ScheduledTaskAction `
              -Execute $PythonExe `
              -Argument "`"$ScriptPath`"" `
              -WorkingDirectory $WorkingDir

$Settings = New-ScheduledTaskSettingsSet `
              -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
              -RestartCount 1 `
              -RestartInterval (New-TimeSpan -Minutes 10) `
              -StartWhenAvailable

Register-ScheduledTask `
  -TaskName $TaskName `
  -Trigger  $Trigger `
  -Action   $Action `
  -Settings $Settings `
  -Force

Write-Host "Tarea '$TaskName' registrada. Se ejecuta diariamente a las 07:00."
Write-Host "Para ejecutar manualmente: Start-ScheduledTask -TaskName '$TaskName'"
