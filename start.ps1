# CHOLIS School360 Lite — Start Script

Write-Host "=== CHOLIS School360 Lite ===" -ForegroundColor Cyan
Write-Host "Starting server and client..." -ForegroundColor White

# Create data directory
New-Item -ItemType Directory -Force -Path "$PSScriptRoot\data" | Out-Null

# Start server
$serverLog = "$PSScriptRoot\server.log"
Start-Process -FilePath "powershell.exe" -ArgumentList "-ExecutionPolicy Bypass -Command `"cd '$PSScriptRoot\server'; npm run dev`"" -RedirectStandardOutput $serverLog -NoNewWindow

Write-Host "Server starting on http://localhost:3001" -ForegroundColor Green
Start-Sleep -Seconds 3

# Start client
$clientLog = "$PSScriptRoot\client.log"
Start-Process -FilePath "powershell.exe" -ArgumentList "-ExecutionPolicy Bypass -Command `"cd '$PSScriptRoot\client'; npm run dev`"" -RedirectStandardOutput $clientLog -NoNewWindow

Write-Host "Client starting on http://localhost:5173" -ForegroundColor Green
Write-Host ""
Write-Host "Open: http://localhost:5173" -ForegroundColor Yellow
Write-Host "Parent Hub: http://localhost:5173/parent" -ForegroundColor Yellow
