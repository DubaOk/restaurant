# Запуск всего проекта одной командой (Windows)
Set-Location $PSScriptRoot

$envFile = $null
if (Test-Path ".env") { $envFile = ".env" }
elseif (Test-Path ".env.docker") { $envFile = ".env.docker" }

if ($envFile) {
    $keyLine = Select-String -Path $envFile -Pattern '^\s*VITE_YANDEX_MAPS_API_KEY\s*=\s*(.+)\s*$' -ErrorAction SilentlyContinue | Select-Object -First 1
    $keyVal = if ($keyLine) { $keyLine.Matches.Groups[1].Value.Trim() } else { "" }
    if (-not $keyVal) {
        Write-Host ""
        Write-Host "ВНИМАНИЕ: в $envFile не задан VITE_YANDEX_MAPS_API_KEY — карты Яндекса не загрузятся." -ForegroundColor Yellow
        Write-Host "Вставьте ключ из developer.tech.yandex.ru и перезапустите этот скрипт." -ForegroundColor Yellow
        Write-Host ""
    }
    docker compose --env-file $envFile build frontend
    docker compose --env-file $envFile up -d --build
} else {
    docker compose up -d --build
}

if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host ""
Write-Host "========================================"
Write-Host "  https://localhost"
Write-Host "  Admin: admin@restaurants.by / admin123"
if ($envFile) { Write-Host "  Env: $envFile" }
Write-Host "========================================"
Write-Host ""
Write-Host "Logs: docker compose logs -f"
Write-Host "Stop: docker compose down"
